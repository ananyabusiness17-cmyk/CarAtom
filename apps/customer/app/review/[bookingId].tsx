import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@caratom/api-client';

import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { newIdempotencyKey } from '../../src/lib/formatMoney';
import { colors, type } from '../../src/theme/tokens';

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [thanks, setThanks] = useState(false);
  const [existing, setExisting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(newIdempotencyKey('review'));

  const bookingQuery = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => apiClient.getBooking(bookingId),
    enabled: Boolean(bookingId),
  });

  useEffect(() => {
    track('review_started', { booking_id: bookingId });
  }, [bookingId]);

  useEffect(() => {
    if (bookingQuery.data?.review_submitted) {
      setThanks(true);
    }
  }, [bookingQuery.data?.review_submitted]);

  const submit = useMutation({
    mutationFn: () =>
      apiClient.submitReview(
        { booking_id: bookingId, rating, comment: comment.trim() || null },
        keyRef.current,
      ),
    onSuccess: (review) => {
      track('review_submitted', { rating: review.rating });
      setExisting(review.rating);
      setThanks(true);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.problem?.code === 'REVIEW_ALREADY_SUBMITTED') {
        setThanks(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not submit rating.');
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
      <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={() => router.back()}>
        <Text style={styles.skip}>Skip</Text>
      </Pressable>
      {thanks ? (
        <View style={styles.center}>
          <Text style={styles.title}>Thank you</Text>
          <Text style={styles.body}>
            {existing ? `You rated this service ${existing} stars` : 'We appreciate your feedback.'}
          </Text>
          <PrimaryButton label="Done" onPress={() => router.replace(`/booking/${bookingId}`)} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>How was your service?</Text>
          <Text style={styles.body}>Your feedback helps us improve doorstep service.</Text>
          {error ? <InlineBanner message={error} /> : null}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${value} stars`}
                onPress={() => setRating(value)}
                style={styles.starHit}
              >
                <Text style={[styles.star, value <= rating ? styles.starOn : null]}>
                  {value <= rating ? '★' : '☆'}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Anything else you'd like to share? (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            style={styles.input}
            accessibilityLabel="Optional comment"
          />
          <Text style={styles.counter}>{comment.length}/2000</Text>
          <PrimaryButton
            label="Submit rating"
            disabled={rating < 1 || submit.isPending}
            onPress={() => submit.mutate()}
          />
        </ScrollView>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas, padding: 24 },
  flex: { flex: 1 },
  skip: { ...type.bodyMedium, color: colors.brandStrong, minHeight: 44, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', gap: 12, paddingTop: 24 },
  title: { ...type.navTitle, fontSize: 22, color: colors.textStrong, textAlign: 'center' },
  body: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  stars: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  starHit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 32, color: colors.border },
  starOn: { color: colors.warning },
  input: {
    width: '100%',
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    textAlignVertical: 'top',
  },
  counter: { ...type.caption, color: colors.textMuted, alignSelf: 'flex-end' },
});
