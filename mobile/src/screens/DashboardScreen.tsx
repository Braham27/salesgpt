import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { callsApi, prospectsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuthStore();

  const { data: calls = [], refetch: refetchCalls, isLoading: isLoadingCalls } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const response = await callsApi.list();
      return response.data;
    },
  });

  const { data: prospects = [], refetch: refetchProspects, isLoading: isLoadingProspects } = useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const response = await prospectsApi.list();
      return response.data;
    },
  });

  const isLoading = isLoadingCalls || isLoadingProspects;

  const onRefresh = async () => {
    await Promise.all([refetchCalls(), refetchProspects()]);
  };

  const completedCalls = calls.filter((c: any) => c.status === 'completed').length;
  const thisWeekCalls = calls.filter((c: any) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(c.start_time) > weekAgo;
  }).length;

  const stats = [
    { label: 'Total Calls', value: calls.length, icon: 'call', color: '#3b82f6' },
    { label: 'This Week', value: thisWeekCalls, icon: 'calendar', color: '#8b5cf6' },
    { label: 'Completed', value: completedCalls, icon: 'checkmark-circle', color: '#10b981' },
    { label: 'Prospects', value: prospects.length, icon: 'people', color: '#f59e0b' },
  ];

  const recentCalls = calls.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#3b82f6" />
      }
    >
      {/* Welcome Header */}
      <LinearGradient
        colors={['#3b82f6', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.welcomeCard}
      >
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
        <TouchableOpacity
          style={styles.newCallButton}
          onPress={() => navigation.navigate('NewCall')}
        >
          <Ionicons name="call" size={20} color="#3b82f6" />
          <Text style={styles.newCallText}>Start New Call</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Calls */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Calls</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Calls')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentCalls.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>No calls yet</Text>
            <Text style={styles.emptySubtext}>Start your first AI-powered call</Text>
          </View>
        ) : (
          recentCalls.map((call: any) => (
            <TouchableOpacity
              key={call.id}
              style={styles.callCard}
              onPress={() => navigation.navigate('CallSummary', { callId: call.id })}
            >
              <View style={styles.callAvatar}>
                <Text style={styles.avatarText}>
                  {call.prospect?.name?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.callInfo}>
                <Text style={styles.callName}>{call.prospect?.name || 'Unknown'}</Text>
                <Text style={styles.callCompany}>{call.prospect?.company || 'No company'}</Text>
              </View>
              <View style={styles.callMeta}>
                <Text style={styles.callDate}>
                  {new Date(call.start_time).toLocaleDateString()}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: call.status === 'completed' ? '#10b98120' : '#f59e0b20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: call.status === 'completed' ? '#10b981' : '#f59e0b' }
                  ]}>
                    {call.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Prospects')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="person-add" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.actionText}>Add Prospect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Products')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="cube" size={24} color="#10b981" />
            </View>
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('NewCall')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="mic" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Quick Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  welcomeCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  newCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  newCallText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    color: '#3b82f6',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  callAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  callInfo: {
    flex: 1,
    marginLeft: 12,
  },
  callName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  callCompany: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 2,
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  callDate: {
    color: '#6b7280',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
