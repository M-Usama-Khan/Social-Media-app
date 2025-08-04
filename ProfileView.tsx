import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type ProfileViewNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProfileView'
>;

type RouteParams = {
  userId: string;
};

const ProfileView = () => {
  const navigation = useNavigation<ProfileViewNavigationProp>();
  const route = useRoute();
  const { userId } = route.params as RouteParams;
  const currentUserId = auth().currentUser?.uid;
  
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get user profile data
        const userDoc = await firestore().collection('users').doc(userId).get();
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Get user posts
        const postsQuery = await firestore()
          .collection('posts')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();
        
        setPosts(postsQuery.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        })));

        // Check if current user is following this user
        if (currentUserId && currentUserId !== userId) {
          const followDoc = await firestore()
            .collection('followers')
            .doc(`${currentUserId}_${userId}`)
            .get();
          
          setIsFollowing(followDoc.exists);
        }

        // Get followers and following count
        const followersSnapshot = await firestore()
          .collection('followers')
          .where('followingId', '==', userId)
          .get();
        
        const followingSnapshot = await firestore()
          .collection('followers')
          .where('followerId', '==', userId)
          .get();
        
        setFollowersCount(followersSnapshot.size);
        setFollowingCount(followingSnapshot.size);

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId, currentUserId]);

  const handleFollow = async () => {
    if (!currentUserId || currentUserId === userId) return;
    
    try {
      const followRef = firestore()
        .collection('followers')
        .doc(`${currentUserId}_${userId}`);
      
      if (isFollowing) {
        await followRef.delete();
        setFollowersCount(prev => prev - 1);
      } else {
        await followRef.set({
          followerId: currentUserId,
          followingId: userId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        setFollowersCount(prev => prev + 1);
      }
      
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  if (!userData) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userData.photoBase64 ? (
              <Image 
                source={{ uri: userData.photoBase64 }} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcon name="person" size={50} color="#667eea" />
              </View>
            )}
          </View>
          
          <Text style={styles.displayName}>{userData.displayName || 'User'}</Text>
          {userData.bio && <Text style={styles.bio}>{userData.bio}</Text>}
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
          
          {currentUserId && currentUserId !== userId && (
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing ? styles.followingButton : styles.notFollowingButton
              ]}
              onPress={handleFollow}
            >
              <Text style={styles.followButtonText}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Recent Posts</Text>
          
          {posts.length === 0 ? (
            <View style={styles.noPostsContainer}>
              <MaterialIcon name="post-add" size={40} color="#667eea" />
              <Text style={styles.noPostsText}>No posts yet</Text>
            </View>
          ) : (
            posts.map(post => (
              <View key={post.id} style={styles.postCard}>
                <Text style={styles.postText}>{post.text}</Text>
                {post.imageBase64 && (
                  <Image 
                    source={{ uri: post.imageBase64 }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.postDate}>
                  {post.createdAt.toLocaleDateString()} at {' '}
                  {post.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
  },
  profileHeader: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#667eea',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#667eea',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 10,
  },
  notFollowingButton: {
    backgroundColor: '#667eea',
  },
  followingButton: {
    backgroundColor: '#ccc',
  },
  followButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  postsSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noPostsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noPostsText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  postCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  postText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});

export default ProfileView;