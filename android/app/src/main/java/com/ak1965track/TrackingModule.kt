package com.ak1965track

import android.content.Intent
import android.location.Location
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TrackingModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TrackingModule"
        private var instance: TrackingModule? = null

        fun emitLocation(location: Location, activityId: String) {
            instance?.let { module ->
                val params = Arguments.createMap().apply {
                    putString("activityId", activityId)
                    putDouble("latitude", location.latitude)
                    putDouble("longitude", location.longitude)
                    putDouble("altitude", if (location.hasAltitude()) location.altitude else 0.0)
                    putDouble("speed", if (location.hasSpeed()) location.speed.toDouble() else 0.0)
                    putDouble("accuracy", if (location.hasAccuracy()) location.accuracy.toDouble() else 0.0)
                    putDouble("bearing", if (location.hasBearing()) location.bearing.toDouble() else 0.0)
                    putDouble("timestamp", location.time.toDouble())
                }
                module.sendEvent("onLocationReceived", params)
            }
        }

        fun emitStepCount(steps: Int) {
            instance?.let { module ->
                val params = Arguments.createMap().apply {
                    putInt("steps", steps)
                }
                module.sendEvent("onStepCountReceived", params)
            }
        }

        fun emitTrackingEvent(eventName: String, params: WritableMap?) {
            instance?.sendEvent(eventName, params ?: Arguments.createMap())
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = NAME

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactContext.emitDeviceEvent(eventName, params)
            android.util.Log.d("AK1965_TRACK", "sendEvent OK: $eventName")
        } catch (e: Exception) {
            try {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
                android.util.Log.d("AK1965_TRACK", "sendEvent fallback OK: $eventName")
            } catch (ex: Exception) {
                android.util.Log.e("AK1965_TRACK", "sendEvent failed: ${ex.message}")
            }
        }
    }

    @ReactMethod
    fun startTracking(activityId: String, activityType: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, TrackingService::class.java).apply {
                action = TrackingService.ACTION_START
                putExtra(TrackingService.EXTRA_ACTIVITY_ID, activityId)
                putExtra(TrackingService.EXTRA_ACTIVITY_TYPE, activityType)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pauseTracking(promise: Promise) {
        try {
            val intent = Intent(reactContext, TrackingService::class.java).apply {
                action = TrackingService.ACTION_PAUSE
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun resumeTracking(promise: Promise) {
        try {
            val intent = Intent(reactContext, TrackingService::class.java).apply {
                action = TrackingService.ACTION_RESUME
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESUME_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            val intent = Intent(reactContext, TrackingService::class.java).apply {
                action = TrackingService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateNotification(distance: String, duration: String, pace: String) {
        try {
            val intent = Intent(reactContext, TrackingService::class.java).apply {
                action = TrackingService.ACTION_UPDATE_NOTIFICATION
                putExtra(TrackingService.EXTRA_DISTANCE, distance)
                putExtra(TrackingService.EXTRA_DURATION, duration)
                putExtra(TrackingService.EXTRA_PACE, pace)
            }
            reactContext.startService(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun isTracking(promise: Promise) {
        promise.resolve(TrackingService.isServiceRunning)
    }

    // Required for React Native EventEmitter support
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
