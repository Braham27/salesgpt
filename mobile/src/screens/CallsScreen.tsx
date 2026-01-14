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
import { callsApi } from '../services/api';

export default function CallsScreen({ navigation }: any) {
  const { data: calls = [], refetch, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const response = await callsApi.list();
      return response.data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: '#3b82f620', text: '#3b82f6' };
      case 'in_progress': return { bg: '#f59e0b20', text: '#f59e0b' };
      case 'completed': return { bg: '#10b98120', text: '#10b981' };
      case 'cancelled': return { bg: '#ef444420', text: '#ef4444' };
      default: return { bg: '#6b728020', text: '#6b7280' };
    }
  };

  const getDuration = (call: any) => {
    if (!call.end_time || !call.start_time) return '-';
    const duration = Math.round(
      (new Date(call.end_time).getTime() - new Date(call.start_time).getTime()) / 1000 / 60
    );
    return `${duration} min`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />
        }
      >
        {calls.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyTitle}>No Calls Yet</Text>
            <Text style={styles.emptyText}>
              Start your first AI-powered sales call to see it here
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('NewCall')}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Start New Call</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {calls.map((call: any) => {
              const statusColors = getStatusColor(call.status);
              return (
                <TouchableOpacity
                  key={call.id}
                  style={styles.callCard}
                  onPress={() => navigation.navigate('CallSummary', { callId: call.id })}
                >
                  <View style={styles.callHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {call.prospect?.name?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View style={styles.callInfo}>
                      <Text style={styles.callName}>
                        {call.prospect?.name || 'Unknown Prospect'}
                      </Text>
                      <Text style={styles.callCompany}>
                        {call.prospect?.company || 'No company'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>
                        {call.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.callMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>
                        {new Date(call.start_time).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>
                        {new Date(call.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="hourglass-outline" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>{getDuration(call)}</Text>
                    </View>
                  </View>

                  {call.summary?.summary && (
                    <Text style={styles.summary} numberOfLines={2}>
                      {call.summary.summary}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewCall')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  callCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
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
    fontWeight: '600',
  },
  callCompany: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  callMeta: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#6b7280',
    fontSize: 12,
  },
  summary: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 12,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
