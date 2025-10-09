import React, { useState } from 'react';
import { Image, ImageProps, StyleSheet, View, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  lowQualityUri?: string;
  aspectRatio?: number;
  showLoader?: boolean;
}

export default function OptimizedImage({
  uri,
  lowQualityUri,
  aspectRatio = 2 / 3,
  showLoader = true,
  style,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showLowQuality, setShowLowQuality] = useState(!!lowQualityUri);

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    if (showLowQuality) {
      setTimeout(() => setShowLowQuality(false), 100);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <View style={[styles.container, { aspectRatio }, style]}>
        <View style={styles.placeholder}>
          <View style={styles.placeholderIcon} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { aspectRatio }, style]}>
      {showLowQuality && lowQualityUri && (
        <Image
          source={{ uri: lowQualityUri }}
          style={[StyleSheet.absoluteFill, styles.lowQualityImage]}
          blurRadius={2}
        />
      )}
      
      <Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, styles.image]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
      
      {isLoading && showLoader && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={Colors.dark.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.dark.surfaceLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lowQualityImage: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceLight,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceLight,
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.border,
  },
});
