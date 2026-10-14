import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDeviceStore } from '../store/deviceStore';
import { useLogStore } from '../store/logStore';
import { useDeploymentStore } from '../store/deploymentStore';
import { useProgressStore } from '../store/progressStore';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { getSelectedConnectedDevices } from '../utils/selectedDevice';

const DashboardScreen: React.FC = () => {
  const { devices, addDevice, updateDevice, clearDevices } = useDeviceStore();
  const { clearLogs } = useLogStore();
  const { clearJobs } = useDeploymentStore();
  const { clearProgress } = useProgressStore();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  
  const connectedCount = devices.filter(d => d.state === 'Connected').length;
  const onlineCount = connectedCount;
  const offlineCount = devices.filter(d => d.state === 'Disconnected' || d.state === 'Error').length;
  const refreshTvStatus = async () => {
    setRefreshing(true);
    try {
      const connected = await TvControlService.getConnectedDevices();
      connected.forEach((device: any) => addDevice({ ...device, state: 'Connected' }));
      // Do not mark a TV offline from a single snapshot: a wireless ADB socket
      // can be busy during an upload while the TV itself remains online.
      Alert.alert('Controller refreshed', `${connected.length} TV connection(s) refreshed.`);
    } catch (error: any) {
      Alert.alert('Refresh failed', error?.message || 'Unable to refresh TV status.');
    } finally { setRefreshing(false); }
  };
  const scanTvs = async () => {
    setScanning(true);
    try {
      const discovered = await TvControlService.scanWifiDevices().catch(() => []);
      if (!discovered.length) {
        Alert.alert('No ADB TVs found', 'Make sure TVs are on the same network and have ADB/Developer Options enabled. For Google TV, use Pair Google TV option.');
        navigation.navigate('TVs');
        return;
      }
      const results = await Promise.allSettled(discovered.map((endpoint: any) =>
        TvControlService.connectWifiDevice(endpoint.ipAddress, endpoint.port),
      ));
      const connected = results.filter(result => result.status === 'fulfilled').map(result => (result as PromiseFulfilledResult<any>).value);
      connected.forEach(device => {
        addDevice(device);
        // A connected device is useful even if a vendor briefly delays props.
        // Refreshing makes Android version/model populate instead of Unknown.
        TvControlService.getDeviceInfo(device.deviceId).then(info => updateDevice(device.deviceId, { deviceInfo: {
          serial: info['ro.serialno'] || '', manufacturer: info['ro.product.manufacturer'] || '', model: info['ro.product.model'] || '',
          androidVersion: info['ro.build.version.release'] || '', sdkVersion: Number(info['ro.build.version.sdk']) || 0,
          screenResolution: info.screen_size || '', density: info.density || '', storage: info.storage || '',
        } })).catch(() => undefined);
      });
      const waiting = discovered.length - connected.length;
      Alert.alert('TV scan complete', `${connected.length}/${discovered.length} TV(s) connected.${waiting ? ` ${waiting} TV(s) need "Allow" on TV screen - check your TV for authorization prompt.` : ''}`);
      navigation.navigate('TVs');
    } catch (error: any) {
      Alert.alert('Scan failed', error?.message || 'Connect the controller and TVs to the same Wi-Fi network.');
    } finally { setScanning(false); }
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data?',
      'This will remove all saved devices, logs, deployment history, progress data, and all app settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              clearDevices();
              clearLogs();
              clearJobs();
              clearProgress();
              Alert.alert('Data Cleared', 'All app data has been cleared. The app will restart.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const uninstallProfileAndChannels = async () => {
    const devices = getSelectedConnectedDevices();
    if (devices.length === 0) {
      Alert.alert('No TVs Selected', 'Please select connected TVs from the TVs page first.');
      navigation.navigate('TVs');
      return;
    }

    Alert.alert(
      'Uninstall Profile & Channels?',
      `This will uninstall tv.cloudwalker.profile and tv.cloudwalker.channels from ${devices.length} selected TV(s). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Uninstall',
          style: 'destructive',
          onPress: async () => {
            try {
              let successCount = 0;
              let failCount = 0;

              for (const device of devices) {
                try {
                  await TvControlService.shell(device.deviceId, 'pm uninstall --user 0 tv.cloudwalker.profile');
                  await TvControlService.shell(device.deviceId, 'pm uninstall --user 0 tv.cloudwalker.channels');
                  successCount++;
                } catch (error) {
                  console.error(`Failed to uninstall on ${device.name}:`, error);
                  failCount++;
                }
              }

              Alert.alert(
                'Uninstall Complete',
                `Successfully uninstalled from ${successCount} TV(s).${failCount > 0 ? ` Failed on ${failCount} TV(s).` : ''}`
              );
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to uninstall packages.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AWS-TVControlCenter</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Connected TVs</Text>
          <Text style={styles.statValue}>{connectedCount}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Online</Text>
          <Text style={[styles.statValue, { color: Colors.success }]}>{onlineCount}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Offline</Text>
          <Text style={[styles.statValue, { color: Colors.error }]}>{offlineCount}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Last Deployment</Text>
        <Text style={[styles.statusValue, { color: Colors.success }]}>SUCCESS</Text>
      </View>

      <TouchableOpacity style={[styles.button, scanning && styles.buttonDisabled]} onPress={scanTvs} disabled={scanning}>
        {scanning ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>SCAN / CONNECT TVs</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={() => navigation.navigate('Deploy')}>
        <Text style={styles.buttonText}>DEPLOY APK</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, refreshing && styles.buttonDisabled]} onPress={refreshTvStatus} disabled={refreshing}>
        {refreshing ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>REFRESH CONTROLLER</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.uninstallButton]} onPress={uninstallProfileAndChannels}>
        <Text style={styles.buttonText}>UNINSTALL PROFILE & CHANNELS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.clearDataButton]} onPress={clearAllData}>
        <Text style={styles.buttonText}>CLEAR ALL DATA</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  cleanupButton: { backgroundColor: Colors.warning, borderWidth: 0 },
  uninstallButton: { backgroundColor: '#FF6B35', borderWidth: 0 },
  clearDataButton: { backgroundColor: Colors.error, borderWidth: 0 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default DashboardScreen;
