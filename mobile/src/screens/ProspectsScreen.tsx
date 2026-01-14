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
import { prospectsApi } from '../services/api';

export default function ProspectsScreen({ navigation }: any) {
  const { data: prospects = [], refetch, isLoading } = useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const response = await prospectsApi.list();
      return response.data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return { bg: '#3b82f620', text: '#3b82f6' };
      case 'contacted': return { bg: '#f59e0b20', text: '#f59e0b' };
      case 'qualified': return { bg: '#10b98120', text: '#10b981' };
      case 'proposal': return { bg: '#8b5cf620', text: '#8b5cf6' };
      case 'closed': return { bg: '#10b98120', text: '#10b981' };
      case 'lost': return { bg: '#ef444420', text: '#ef4444' };
      default: return { bg: '#6b728020', text: '#6b7280' };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />
        }
      >
        {prospects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyTitle}>No Prospects Yet</Text>
            <Text style={styles.emptyText}>
              Add your first prospect to start tracking your pipeline
            </Text>
            <TouchableOpacity style={styles.emptyButton}>
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Prospect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {prospects.map((prospect: any) => {
              const statusColors = getStatusColor(prospect.status);
              return (
                <TouchableOpacity key={prospect.id} style={styles.prospectCard}>
                  <View style={styles.prospectHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {prospect.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.prospectInfo}>
                      <Text style={styles.prospectName}>{prospect.name}</Text>
                      {prospect.title && (
                        <Text style={styles.prospectTitle}>{prospect.title}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>
                        {prospect.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.prospectDetails}>
                    {prospect.company && (
                      <View style={styles.detailItem}>
                        <Ionicons name="business-outline" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>{prospect.company}</Text>
                      </View>
                    )}
                    {prospect.email && (
                      <View style={styles.detailItem}>
                        <Ionicons name="mail-outline" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>{prospect.email}</Text>
                      </View>
                    )}
                    {prospect.phone && (
                      <View style={styles.detailItem}>
                        <Ionicons name="call-outline" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>{prospect.phone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('NewCall', { prospectId: prospect.id })}
                    >
                      <Ionicons name="call" size={18} color="#10b981" />
                      <Text style={[styles.actionText, { color: '#10b981' }]}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="create-outline" size={18} color="#3b82f6" />
                      <Text style={[styles.actionText, { color: '#3b82f6' }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
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
  prospectCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  prospectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  prospectInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prospectName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  prospectTitle: {
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
  prospectDetails: {
    marginTop: 12,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
