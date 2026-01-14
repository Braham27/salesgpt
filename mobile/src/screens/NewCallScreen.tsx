import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { prospectsApi, callsApi } from '../services/api';

export default function NewCallScreen({ navigation }: any) {
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [context, setContext] = useState('');
  const [objectives, setObjectives] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const response = await prospectsApi.list();
      return response.data;
    },
  });

  const handleStartCall = async () => {
    setIsCreating(true);
    try {
      const response = await callsApi.create({
        prospect_id: selectedProspect?.id,
        context: `${context}\n\nObjectives: ${objectives}`,
      });
      
      navigation.navigate('LiveCall', {
        callId: response.data.id,
        prospect: selectedProspect,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create call');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Select Prospect */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Prospect</Text>
        <Text style={styles.sectionSubtitle}>Choose who you're calling</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prospectsScroll}>
          <TouchableOpacity
            style={[
              styles.prospectCard,
              !selectedProspect && styles.prospectCardSelected,
            ]}
            onPress={() => setSelectedProspect(null)}
          >
            <View style={styles.addProspectIcon}>
              <Ionicons name="person-add" size={24} color="#6b7280" />
            </View>
            <Text style={styles.prospectName}>Quick Call</Text>
            <Text style={styles.prospectCompany}>No prospect</Text>
          </TouchableOpacity>

          {prospects.map((prospect: any) => (
            <TouchableOpacity
              key={prospect.id}
              style={[
                styles.prospectCard,
                selectedProspect?.id === prospect.id && styles.prospectCardSelected,
              ]}
              onPress={() => setSelectedProspect(prospect)}
            >
              <View style={styles.prospectAvatar}>
                <Text style={styles.avatarText}>{prospect.name.charAt(0)}</Text>
              </View>
              <Text style={styles.prospectName} numberOfLines={1}>{prospect.name}</Text>
              <Text style={styles.prospectCompany} numberOfLines={1}>
                {prospect.company || 'No company'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Call Context */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Context</Text>
        <Text style={styles.sectionSubtitle}>
          Provide background information for AI suggestions
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="E.g., Following up on demo request, interested in enterprise plan..."
          placeholderTextColor="#6b7280"
          value={context}
          onChangeText={setContext}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Call Objectives */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Objectives</Text>
        <Text style={styles.sectionSubtitle}>
          What do you want to achieve in this call?
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="E.g., Schedule a demo, understand their budget, identify decision makers..."
          placeholderTextColor="#6b7280"
          value={objectives}
          onChangeText={setObjectives}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Quick Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Quick Tips</Text>
        <View style={styles.tipsList}>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.tipText}>Ensure you're in a quiet environment</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.tipText}>Obtain verbal consent for recording</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.tipText}>Speak clearly for accurate transcription</Text>
          </View>
        </View>
      </View>

      {/* Start Call Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartCall}
          disabled={isCreating}
        >
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.startButtonText}>
              {isCreating ? 'Starting...' : 'Start Call'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  prospectsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  prospectCard: {
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prospectCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  addProspectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  prospectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  prospectName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  prospectCompany: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tipsContainer: {
    padding: 16,
    backgroundColor: 'rgba(16,185,129,0.1)',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  tipsTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
