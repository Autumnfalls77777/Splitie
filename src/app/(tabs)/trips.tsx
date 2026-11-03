import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, SearchX, X } from 'lucide-react-native';

import { TripCard } from '@/components/trips/TripCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/features/auth/auth.store';
import { useTripsQuery } from '@/features/trips/queries';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme';

type Filter = 'all' | 'active' | 'settled';

export default function TripsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const youId = user?.id ?? '';
  const query = useTripsQuery(youId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const trips = query.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return trips.filter((item) => {
      if (filter === 'active' && !(item.status === 'active' || item.status === 'upcoming')) return false;
      if (filter === 'settled' && item.status !== 'settled') return false;
      if (!term) return true;
      return (
        item.trip.name.toLowerCase().includes(term) ||
        item.trip.destination.toLowerCase().includes(term) ||
        item.trip.members.some((member) => member.name.toLowerCase().includes(term))
      );
    });
  }, [filter, search, trips]);

  const totals = useMemo(() => {
    let spent = 0;
    let owed = 0;
    let owe = 0;
    for (const item of trips) {
      spent += item.summary.totalPaise;
      if (item.summary.yourBalancePaise > 0) owed += item.summary.yourBalancePaise;
      else owe += Math.abs(item.summary.yourBalancePaise);
    }
    return { spent, owed, owe };
  }, [trips]);

  const activeCount = trips.filter((item) => item.status === 'active' || item.status === 'upcoming').length;
  const settledCount = trips.filter((item) => item.status === 'settled').length;

  return (
    <Screen
      contentBottom={132}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => { void query.refetch(); }}
          tintColor={theme.colors.limeDeep}
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: theme.fonts.displayXBold,
              fontSize: 34,
              lineHeight: 38,
              letterSpacing: -1.4,
            }}
          >
            Trips
          </Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.inkSubtle, marginTop: 2 }}>
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'} · {activeCount} still open
          </Text>
        </View>
        <IconButton
          icon={Plus}
          variant="lime"
          accessibilityLabel="Create a new trip"
          onPress={() => router.push('/trip/new')}
        />
      </View>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search trips, places or friends"
        icon={Search}
        autoCapitalize="none"
        right={
          search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <X size={17} color={theme.colors.inkSubtle} />
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        style={{ marginTop: 14 }}
      >
        <Chip label="All trips" count={trips.length} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Open" count={activeCount} selected={filter === 'active'} onPress={() => setFilter('active')} />
        <Chip label="Settled" count={settledCount} selected={filter === 'settled'} onPress={() => setFilter('settled')} />
      </ScrollView>

      {query.isLoading && trips.length === 0 ? (
        <View style={{ gap: 14, marginTop: 20 }}>
          <Skeleton height={126} radius={24} />
          <Skeleton height={300} radius={26} />
          <Skeleton height={300} radius={26} />
        </View>
      ) : (
        <>
          {trips.length > 0 ? (
            <Card variant="ink" style={{ marginTop: 20 }} padding={18}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkInverse, opacity: 0.55 }}>
                    Total across every trip
                  </Text>
                  <Text
                    style={{
                      fontFamily: theme.fonts.display,
                      fontSize: 28,
                      letterSpacing: -0.9,
                      color: theme.colors.inkInverse,
                      marginTop: 2,
                    }}
                  >
                    {formatMoney(totals.spent)}
                  </Text>
                </View>
                <Badge label={`${settledCount} settled`} tone="lime" dot />
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <View style={styles.summaryBottom}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10, color: theme.colors.inkInverse, opacity: 0.5 }}>
                    Owed to you
                  </Text>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 15, color: theme.colors.lime, marginTop: 2 }}>
                    {formatMoney(totals.owed)}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' }} />
                <View style={{ flex: 1, paddingLeft: 16 }}>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10, color: theme.colors.inkInverse, opacity: 0.5 }}>
                    You owe
                  </Text>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 15, color: theme.colors.negative, marginTop: 2 }}>
                    {formatMoney(totals.owe)}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          <View style={{ gap: 14, marginTop: 20 }}>
            {filtered.map((item) => (
              <TripCard
                key={item.trip.id}
                item={item}
                onPress={() => router.push(`/trip/${item.trip.id}`)}
              />
            ))}
          </View>

          {trips.length === 0 ? (
            <Card style={{ marginTop: 20 }} padding={10}>
              <EmptyState
                icon={Plus}
                title="No trips yet"
                body="Create a trip, add your people, and start splitting. The maths is on us."
                actionLabel="Create a trip"
                onAction={() => router.push('/trip/new')}
              />
            </Card>
          ) : filtered.length === 0 ? (
            <Card style={{ marginTop: 20 }} padding={10}>
              <EmptyState
                icon={SearchX}
                title="Nothing matches"
                body="Try a different name, place, or filter."
                actionLabel="Clear filters"
                onAction={() => {
                  setSearch('');
                  setFilter('all');
                }}
              />
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  summaryBottom: { flexDirection: 'row', alignItems: 'center' },
});
