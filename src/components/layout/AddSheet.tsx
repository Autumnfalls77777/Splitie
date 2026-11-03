import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ChevronRight, Plane, ReceiptText, Wallet, type LucideIcon } from 'lucide-react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useUIStore } from '@/features/settings/ui.store';
import { useTripStore } from '@/features/trips/trips.store';
import { formatDateRange } from '@/lib/date';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

type Action = {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  onPress: () => void;
};

export function AddSheet() {
  const theme = useTheme();
  const router = useRouter();
  const open = useUIStore((state) => state.addSheetOpen);
  const close = useUIStore((state) => state.closeAddSheet);
  const trips = useTripStore((state) => state.trips);
  const [mode, setMode] = useState<'menu' | 'trip'>('menu');
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const [imageUri, setImageUri] = useState<string>('/assets/placeholder.png');

  useEffect(() => {
    if (!open) setMode('menu');
  }, [open]);

  const go = (path: string) => {
    close();
    setTimeout(() => router.push(path as never), 180);
  };

  const activeTrips = trips.filter((trip) => !trip.archived);

  const pickImageFromGallery = async () => {
    // Request permissions on native
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access photos was denied');
        return;
      }
    }

    // Pick image from gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri ?? null;
    setImageUri(uri);
    setHasSelectedImage(true);
    hapticTap();
  };

  const takePicture = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to use camera was denied');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri ?? null;
    setImageUri(uri);
    setHasSelectedImage(true);
    hapticTap();
  };

  const actions: Action[] = [
    {
      key: 'trip-expense',
      title: 'Trip expense',
      subtitle: 'Split it with the group',
      icon: ReceiptText,
      color: theme.colors.limeDeep,
      onPress: async () => {
        hapticTap();
        if (activeTrips.length === 0) {
          go('/trip/new');
        } else if (activeTrips.length === 1) {
          go(`/trip/${activeTrips[0].id}/add-expense`);
        } else {
          setMode('trip');
        }
        // Reset image selection when navigating
        setImageUri('/assets/placeholder.png');
        setHasSelectedImage(false);
      },
    },
    {
      key: 'personal-expense',
      title: 'Personal expense',
      subtitle: 'Track it for yourself',
      icon: Wallet,
      color: theme.colors.sky,
      onPress: () => {
        hapticTap();
        go('/personal/add');
      },
    },
    {
      key: 'new-trip',
      title: 'New trip',
      subtitle: 'Start a fresh split',
      icon: Plane,
      color: theme.colors.clay,
      onPress: () => go('/trip/new'),
    },
  ];

  return (
    <Sheet
      visible={open}
      onClose={close}
      title={mode === 'menu' ? 'What are we splitting?' : 'Which trip?'}
      subtitle={mode === 'menu' ? 'Add it now, sort the maths later.' : 'Pick the trip this expense belongs to.'}
    >
      {mode === 'menu' ? (
        <View style={{ gap: 4 }}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
                    borderRadius: theme.radius.lg,
                  },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Icon size={22} color={action.color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 15 }}>{action.title}</Text>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.inkSubtle, marginTop: 1 }}>
                    {action.subtitle}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.inkSubtle} />
              </Pressable>
            );
          })}
          {/* Image attach section - show at bottom of menu */}
          <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.cameraContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.cameraPreview}
                />
                <Pressable onPress={pickImageFromGallery} style={styles.cameraButton}>
                  <View style={styles.cameraInner}>
                    <Text style={styles.cameraTextInner}>📷</Text>
                  </View>
                </Pressable>
              </View>
              <View style={styles.cameraDetails}>
                <Text style={styles.cameraText}>Photo attached</Text>
                <Text style={{ fontSize: 10, color: theme.colors.inkSubtle }}>Tap to change</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => {
              hapticTap();
              setMode('menu');
            }}
            style={{ paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5, color: theme.colors.limeDeep }}>
              ← Back to options
            </Text>
          </Pressable>
          <View style={{ gap: 8, paddingTop: 4 }}>
            {activeTrips.map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() => go(`/trip/${trip.id}/add-expense`)}
                style={({ pressed }) => [
                  styles.tripRow,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
                    borderColor: theme.colors.line,
                    borderRadius: theme.radius.lg,
                  },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{trip.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 14 }}>{trip.name}</Text>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 1 }}>
                    {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
                  </Text>
                </View>
                <ChevronRight size={17} color={theme.colors.inkSubtle} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, paddingHorizontal: 8 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1 },
  cameraContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1E4D3', // theme.colors.line - light mode default
    backgroundColor: '#EDFBC8', // theme.colors.limeSoft
    overflow: 'hidden',
  },
  cameraPreview: {
    width: 50,
    height: 50,
    resizeMode: 'cover',
  },
  cameraButton: {
    padding: 8,
  },
  cameraIcon: {
    width: 20,
    height: 20,
  },
  cameraDetails: {
    flex: 1,
  },
  cameraText: {
    fontFamily: 'Manrope_500Medium',
    color: '#14180F', // theme.colors.ink
  },
  cameraTextSubtle: {
    fontSize: 10,
    color: '#8B9180', // theme.colors.inkSubtle
  },
  cameraInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDFBC8',
  },
  cameraTextInner: {
    fontSize: 16,
    color: '#14180F',
  },
});