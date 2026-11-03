import React from 'react';
import { View, StyleSheet } from 'react-native';

type TransitionOverlayProps = {
  children: React.ReactNode;
};

export function TransitionOverlay({ children }: TransitionOverlayProps) {
  return <>{children}</>;
}

TransitionOverlay.displayName = 'TransitionOverlay';