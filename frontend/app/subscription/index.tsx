import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const { width, height } = Dimensions.get('window');

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 199,
    duration: '1 Month',
    features: [
      'Unlimited access to all content',
      'HD streaming quality',
      'Watch on multiple devices',
      'Cancel anytime',
      'New episodes every week',
    ],
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: 499,
    duration: '3 Months',
    features: [
      'All Monthly features',
      'Save ₹98 (16% off)',
      'Priority customer support',
      'Early access to new shows',
      'Ad-free experience',
    ],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 1499,
    duration: '12 Months',
    features: [
      'All Quarterly features',
      'Save ₹889 (37% off)',
      'Best value plan',
      'Exclusive premium content',
      'Offline download (coming soon)',
    ],
  },
];

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(plans[1]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    setLoading(true);

    try {
      // Create order on backend
      const orderResponse = await api.post('/subscription/create-order', {
        plan_id: selectedPlan.id,
        amount: selectedPlan.price * 100, // Convert to paise
      });

      const orderData = orderResponse.data;
      setLoading(false);

      // For demo/testing: Simulate payment without WebView
      Alert.alert(
        'Razorpay Payment',
        `Payment for ${selectedPlan.name} plan: ₹${selectedPlan.price}\n\nOrder ID: ${orderData.order_id}\n\nNote: This is a demo. In production, Razorpay payment gateway will open here.\n\nClick "Complete Payment" to simulate successful payment.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Complete Payment',
            onPress: async () => {
              setLoading(true);
              try {
                // Simulate payment verification
                await api.post('/subscription/verify-payment', {
                  order_id: orderData.order_id,
                  payment_id: 'pay_demo_' + Date.now(),
                  signature: 'demo_signature',
                });

                await refreshUser();
                setLoading(false);

                Alert.alert(
                  'Success! 🎉',
                  `You are now a premium member! Your ${selectedPlan.name} subscription is active.`,
                  [
                    {
                      text: 'Start Watching',
                      onPress: () => router.back(),
                    },
                  ]
                );
              } catch (error: any) {
                setLoading(false);
                Alert.alert('Error', error.response?.data?.detail || 'Payment verification failed');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create payment order');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topSection}>
          <Ionicons name="star" size={64} color="#FFD700" />
          <Text style={styles.mainTitle}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Get unlimited access to all shows and exclusive content
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan?.id === plan.id && styles.planCardSelected,
                plan.popular && styles.planCardPopular,
              ]}
              onPress={() => setSelectedPlan(plan)}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={styles.radioButton}>
                  {selectedPlan?.id === plan.id && <View style={styles.radioButtonInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDuration}>{plan.duration}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>₹{plan.price}</Text>
                  <Text style={styles.pricePerMonth}>
                    ₹{Math.round(plan.price / (plan.id === 'monthly' ? 1 : plan.id === 'quarterly' ? 3 : 12))}/mo
                  </Text>
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>
                Subscribe for ₹{selectedPlan?.price}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why Go Premium?</Text>
          
          <View style={styles.benefitRow}>
            <Ionicons name="play-circle" size={32} color="#e50914" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Unlimited Streaming</Text>
              <Text style={styles.benefitDescription}>
                Watch as much as you want, anytime, anywhere
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <Ionicons name="desktop" size={32} color="#e50914" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Multi-Device Access</Text>
              <Text style={styles.benefitDescription}>
                Stream on phone, tablet, and smart TV
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <Ionicons name="sparkles" size={32} color="#e50914" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Exclusive Content</Text>
              <Text style={styles.benefitDescription}>
                Access premium shows and early releases
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <Ionicons name="close-circle" size={32} color="#e50914" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Cancel Anytime</Text>
              <Text style={styles.benefitDescription}>
                No contracts, no commitments
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscription automatically renews unless cancelled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  plansContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  planCardSelected: {
    borderColor: '#e50914',
    backgroundColor: '#2a1a1a',
  },
  planCardPopular: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e50914',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  planDuration: {
    fontSize: 14,
    color: '#999',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  pricePerMonth: {
    fontSize: 12,
    color: '#999',
  },
  featuresContainer: {
    paddingLeft: 36,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
  },
  subscribeButton: {
    flexDirection: 'row',
    backgroundColor: '#e50914',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  benefitsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitText: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#999',
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
