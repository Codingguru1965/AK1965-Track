import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { runDatabaseSelfTest } from './src/database/testDatabase';

function App(): React.JSX.Element {
  useEffect(() => {
    runDatabaseSelfTest().then((result) => {
      if (result.success) {
        console.log('[AK1965_SQLITE_VERIFIED] ALL DATABASE REPOSITORIES OPERATIONAL', JSON.stringify(result.steps));
      } else {
        console.error('[AK1965_SQLITE_ERROR] Database test failed:', result.error);
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
