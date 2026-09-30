package com.ak1965track

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*

class TrackingService : Service(), SensorEventListener {

    companion object {
        const val CHANNEL_ID = "ak1965_tracking_channel"
        const val NOTIFICATION_ID = 1965
        
        const val ACTION_START = "com.ak1965track.ACTION_START"
        const val ACTION_PAUSE = "com.ak1965track.ACTION_PAUSE"
        const val ACTION_RESUME = "com.ak1965track.ACTION_RESUME"
        const val ACTION_STOP = "com.ak1965track.ACTION_STOP"
        const val ACTION_UPDATE_NOTIFICATION = "com.ak1965track.ACTION_UPDATE_NOTIFICATION"

        const val EXTRA_ACTIVITY_ID = "extra_activity_id"
        const val EXTRA_ACTIVITY_TYPE = "extra_activity_type"
        const val EXTRA_DISTANCE = "extra_distance"
        const val EXTRA_DURATION = "extra_duration"
        const val EXTRA_PACE = "extra_pace"
        
        var isServiceRunning = false
            private set
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var locationManager: android.location.LocationManager? = null
    private var androidLocationListener: android.location.LocationListener? = null
    private var lastEmittedTime: Long = 0L
    private var lastEmittedLat: Double = 0.0
    private var lastEmittedLng: Double = 0.0

    private var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    
    private var activityId: String = ""
    private var activityType: String = "running"
    private var isPaused: Boolean = false
    private var initialStepCount: Int = -1
    private var totalStepsDuringActivity: Int = 0

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        locationManager = getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

        createNotificationChannel()
        setupLocationCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY

        when (action) {
            ACTION_START -> {
                activityId = intent.getStringExtra(EXTRA_ACTIVITY_ID) ?: "act_${System.currentTimeMillis()}"
                activityType = intent.getStringExtra(EXTRA_ACTIVITY_TYPE) ?: "running"
                isPaused = false
                initialStepCount = -1
                totalStepsDuringActivity = 0

                acquireWakeLock()
                startForegroundServiceWithNotification("0.00 km • 00:00 • 0'00\" /km")
                startLocationUpdates()
                registerStepListener()
                isServiceRunning = true

                TrackingModule.emitTrackingEvent("onTrackingStarted", null)
            }
            ACTION_PAUSE -> {
                isPaused = true
                stopLocationUpdates()
                updateNotificationContent("Paused • Tap Resume to continue")
                TrackingModule.emitTrackingEvent("onTrackingPaused", null)
            }
            ACTION_RESUME -> {
                isPaused = false
                startLocationUpdates()
                updateNotificationContent("Tracking resumed...")
                TrackingModule.emitTrackingEvent("onTrackingResumed", null)
            }
            ACTION_UPDATE_NOTIFICATION -> {
                val distance = intent.getStringExtra(EXTRA_DISTANCE) ?: "0.00 km"
                val duration = intent.getStringExtra(EXTRA_DURATION) ?: "00:00"
                val pace = intent.getStringExtra(EXTRA_PACE) ?: "0'00\" /km"
                val text = "$distance • $duration • $pace"
                updateNotificationContent(text)
            }
            ACTION_STOP -> {
                stopTrackingAndSelf()
            }
        }

        return START_STICKY
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "AK1965Track::TrackingWakeLock"
            )
        }
        if (wakeLock?.isHeld == false) {
            wakeLock?.acquire(24 * 60 * 60 * 1000L) // Safe 24hr max timeout
        }
    }

    private fun releaseWakeLock() {
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        wakeLock = null
    }

    private fun handleLocation(location: Location) {
        if (isPaused) return
        val now = System.currentTimeMillis()
        if (now - lastEmittedTime < 800 &&
            Math.abs(location.latitude - lastEmittedLat) < 0.000001 &&
            Math.abs(location.longitude - lastEmittedLng) < 0.000001
        ) {
            return
        }
        lastEmittedTime = now
        lastEmittedLat = location.latitude
        lastEmittedLng = location.longitude

        android.util.Log.i(
            "AK1965_TRACK",
            "Location fix [${location.provider}]: lat=${location.latitude}, lon=${location.longitude}, acc=${location.accuracy}"
        )
        TrackingModule.emitLocation(location, activityId)
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    handleLocation(location)
                }
            }
        }

        androidLocationListener = object : android.location.LocationListener {
            override fun onLocationChanged(location: Location) {
                handleLocation(location)
            }
            override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }
    }

    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            2000L // 2 seconds interval
        ).apply {
            setMinUpdateIntervalMillis(1000L) // 1 second fastest
            setMinUpdateDistanceMeters(1.0f)   // 1 meter displacement
            setWaitForAccurateLocation(false)
        }.build()

        try {
            android.util.Log.i("AK1965_TRACK", "Requesting FusedLocationProviderClient updates")
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            ).addOnSuccessListener {
                android.util.Log.i("AK1965_TRACK", "FusedLocationProviderClient connected successfully")
            }.addOnFailureListener { e ->
                android.util.Log.w("AK1965_TRACK", "FusedLocationProviderClient failed: ${e.message}")
            }
        } catch (e: SecurityException) {
            android.util.Log.e("AK1965_TRACK", "SecurityException requesting fused location: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e("AK1965_TRACK", "Error requesting fused location: ${e.message}")
        }

        try {
            if (locationManager == null) {
                locationManager = getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
            }
            androidLocationListener?.let { listener ->
                if (locationManager?.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) == true) {
                    android.util.Log.i("AK1965_TRACK", "Requesting LocationManager GPS_PROVIDER updates")
                    locationManager?.requestLocationUpdates(
                        android.location.LocationManager.GPS_PROVIDER,
                        1000L,
                        1.0f,
                        listener,
                        Looper.getMainLooper()
                    )
                }
            }
        } catch (e: SecurityException) {
            android.util.Log.e("AK1965_TRACK", "SecurityException requesting LocationManager: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e("AK1965_TRACK", "Error requesting LocationManager: ${e.message}")
        }
    }

    private fun stopLocationUpdates() {
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        } catch (e: Exception) {
            android.util.Log.e("AK1965_TRACK", "Error removing fused location: ${e.message}")
        }
        try {
            androidLocationListener?.let {
                locationManager?.removeUpdates(it)
            }
        } catch (e: Exception) {
            android.util.Log.e("AK1965_TRACK", "Error removing LocationManager updates: ${e.message}")
        }
    }

    private fun registerStepListener() {
        stepSensor?.let { sensor ->
            sensorManager?.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_UI
            )
        }
    }

    private fun unregisterStepListener() {
        sensorManager?.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (isPaused || event == null) return

        if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
            val totalSteps = event.values[0].toInt()
            if (initialStepCount < 0) {
                initialStepCount = totalSteps
            }
            totalStepsDuringActivity = totalSteps - initialStepCount
            TrackingModule.emitStepCount(totalStepsDuringActivity)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "AK1965 Live Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Displays ongoing GPS fitness workout metrics"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(contentText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // Action Buttons: Pause/Resume and Stop
        val pauseResumeAction = if (isPaused) {
            val resumeIntent = Intent(this, TrackingService::class.java).apply { action = ACTION_RESUME }
            val resumePendingIntent = PendingIntent.getService(
                this, 1, resumeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )
            NotificationCompat.Action.Builder(0, "▶ Resume", resumePendingIntent).build()
        } else {
            val pauseIntent = Intent(this, TrackingService::class.java).apply { action = ACTION_PAUSE }
            val pausePendingIntent = PendingIntent.getService(
                this, 2, pauseIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )
            NotificationCompat.Action.Builder(0, "⏸ Pause", pausePendingIntent).build()
        }

        val stopIntent = Intent(this, TrackingService::class.java).apply { action = ACTION_STOP }
        val stopPendingIntent = PendingIntent.getService(
            this, 3, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )
        val stopAction = NotificationCompat.Action.Builder(0, "⏹ Stop", stopPendingIntent).build()

        val typeEmoji = when (activityType.lowercase()) {
            "running" -> "🏃 Running"
            "walking" -> "🚶 Walking"
            "cycling" -> "🚴 Cycling"
            else -> "🏃 Workout"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AK1965 Track • $typeEmoji")
            .setContentText(contentText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(pauseResumeAction)
            .addAction(stopAction)
            .build()
    }

    private fun startForegroundServiceWithNotification(text: String) {
        val notification = buildNotification(text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotificationContent(text: String) {
        val notification = buildNotification(text)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun stopTrackingAndSelf() {
        stopLocationUpdates()
        unregisterStepListener()
        releaseWakeLock()
        isServiceRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        TrackingModule.emitTrackingEvent("onTrackingStopped", null)
    }

    override fun onDestroy() {
        stopTrackingAndSelf()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
