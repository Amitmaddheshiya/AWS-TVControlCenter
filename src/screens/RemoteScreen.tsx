import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, PanResponder, Dimensions } from 'react-native';
import { Colors } from '../constants/colors';
import { KeyCodes } from '../constants/keycodes';
import { TvControlService } from '../services/TvControlService';
import { getSelectedConnectedDevices } from '../utils/selectedDevice';
import { Alert } from 'react-native';

const RemoteScreen: React.FC = () => {
  const [swipeDirection, setSwipeDirection] = React.useState<string | null>(null);
  const { width, height } = Dimensions.get('window');

  const sendKey = async (keyCode: number) => {
    try {
      const devices = getSelectedConnectedDevices();
      const results = await Promise.allSettled(devices.map(device => TvControlService.sendKeyEvent(device.deviceId, keyCode)));
      const failed = results.filter(result => result.status === 'rejected').length;
      if (failed) throw new Error(`Command was sent to ${devices.length - failed}/${devices.length} selected TV(s).`);
    } catch (error: any) {
      Alert.alert('Remote command failed', error?.message || 'Unable to send key event.');
    }
  };

  const openSettings = async () => {
    try {
      const devices = getSelectedConnectedDevices();
      const results = await Promise.allSettled(devices.map(device => TvControlService.shell(device.deviceId, 'am start -a android.settings.SETTINGS')));
      const failed = results.filter(result => result.status === 'rejected').length;
      if (failed) throw new Error(`Settings opened on ${devices.length - failed}/${devices.length} selected TV(s).`);
    } catch (error: any) {
      Alert.alert('Settings command failed', error?.message || 'Unable to open Settings.');
    }
  };

  const openSmartTVApps = async () => {
    try {
      const devices = getSelectedConnectedDevices();
      const results = await Promise.allSettled(devices.map(device => TvControlService.shell(device.deviceId, 'am start -n tv.cloudwalker.apps/.ui.AllAppsMainActivity')));
      const failed = results.filter(result => result.status === 'rejected').length;
      if (failed) throw new Error(`Smart TV Apps opened on ${devices.length - failed}/${devices.length} selected TV(s).`);
    } catch (error: any) {
      Alert.alert('Smart TV Apps command failed', error?.message || 'Unable to open Smart TV Apps.');
    }
  };

  const openGoogleTVApps = async () => {
    try {
      const devices = getSelectedConnectedDevices();
      const results = await Promise.allSettled(devices.map(device => TvControlService.shell(device.deviceId, 'input keyevent 284')));
      const failed = results.filter(result => result.status === 'rejected').length;
      if (failed) throw new Error(`Google TV Apps opened on ${devices.length - failed}/${devices.length} selected TV(s).`);
    } catch (error: any) {
      Alert.alert('Google TV Apps command failed', error?.message || 'Unable to open Google TV Apps.');
    }
  };

  const swipePadResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setSwipeDirection(null),
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const threshold = 30;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > threshold) setSwipeDirection('right');
          else if (dx < -threshold) setSwipeDirection('left');
        } else {
          if (dy > threshold) setSwipeDirection('down');
          else if (dy < -threshold) setSwipeDirection('up');
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const threshold = 50;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > threshold) sendKey(KeyCodes.DPAD_RIGHT);
          else if (dx < -threshold) sendKey(KeyCodes.DPAD_LEFT);
        } else {
          if (dy > threshold) sendKey(KeyCodes.DPAD_DOWN);
          else if (dy < -threshold) sendKey(KeyCodes.DPAD_UP);
        }
        setTimeout(() => setSwipeDirection(null), 300);
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Remote Control</Text>
        </View>

      <View style={styles.dpadContainer}>
        <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_UP)}>
          <Text style={styles.dpadText}>▲</Text>
        </TouchableOpacity>
        
        <View style={styles.dpadRow}>
          <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_LEFT)}>
            <Text style={styles.dpadText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dpadButton, styles.dpadCenter]} onPress={() => sendKey(KeyCodes.DPAD_CENTER)}>
            <Text style={styles.dpadText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_RIGHT)}>
            <Text style={styles.dpadText}>▶</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_DOWN)}>
          <Text style={styles.dpadText}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.BACK)}>
          <Text style={styles.buttonText}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.HOME)}>
          <Text style={styles.buttonText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.settingsButton]} onPress={openSettings}>
          <Text style={styles.buttonText}>SETTING</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.APP_SWITCH)}>
          <Text style={styles.buttonText}>RECENTS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.MENU)}>
          <Text style={styles.buttonText}>MENU</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.volumeButton]} onPress={() => sendKey(KeyCodes.VOLUME_UP)}>
          <Text style={styles.buttonText}>VOL+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.volumeButton]} onPress={() => sendKey(KeyCodes.VOLUME_DOWN)}>
          <Text style={styles.buttonText}>VOL-</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.muteButton]} onPress={() => sendKey(KeyCodes.VOLUME_MUTE)}>
          <Text style={styles.buttonText}>MUTE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.powerButton]} onPress={() => sendKey(KeyCodes.POWER)}>
          <Text style={styles.buttonText}>POWER</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.appsButton]} onPress={openSmartTVApps}>
          <Text style={styles.buttonText}>SMART TV APPS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.appsButton]} onPress={openGoogleTVApps}>
          <Text style={styles.buttonText}>GOOGLE TV APPS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.swipePadContainer}>
        <Text style={styles.swipePadLabel}>SWIPE PAD</Text>
        <View style={styles.swipePad} {...swipePadResponder.panHandlers}>
          <View style={[styles.swipeIndicator, swipeDirection === 'up' && styles.swipeIndicatorActive]}>
            <Text style={styles.swipeArrow}>▲</Text>
          </View>
          <View style={styles.swipeMiddleRow}>
            <View style={[styles.swipeIndicator, swipeDirection === 'left' && styles.swipeIndicatorActive]}>
              <Text style={styles.swipeArrow}>◀</Text>
            </View>
            <View style={styles.swipeCenter}>
              <Text style={styles.swipeCenterText}>SWIPE</Text>
            </View>
            <View style={[styles.swipeIndicator, swipeDirection === 'right' && styles.swipeIndicatorActive]}>
              <Text style={styles.swipeArrow}>▶</Text>
            </View>
          </View>
          <View style={[styles.swipeIndicator, swipeDirection === 'down' && styles.swipeIndicatorActive]}>
            <Text style={styles.swipeArrow}>▼</Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  swipeToggle: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  swipeToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  swipeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  dpadContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dpadButton: {
    width: 60,
    height: 60,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  dpadCenter: {
    backgroundColor: Colors.primary,
  },
  dpadRow: {
    flexDirection: 'row',
  },
  dpadText: {
    fontSize: 24,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  volumeButton: {
    backgroundColor: Colors.surfaceLight,
  },
  muteButton: {
    backgroundColor: Colors.warning,
  },
  powerButton: {
    backgroundColor: Colors.error,
  },
  settingsButton: {
    backgroundColor: Colors.primary,
  },
  appsButton: {
    backgroundColor: Colors.success,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  swipePadContainer: {
    marginTop: 30,
    alignItems: 'center',
    paddingBottom: 40,
  },
  swipePadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  swipePad: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  swipeIndicator: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  swipeIndicatorActive: {
    backgroundColor: Colors.primary,
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  swipeArrow: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: 'bold',
  },
  swipeMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  swipeCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeCenterText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text,
  },
});

export default RemoteScreen;
