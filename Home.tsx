import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

type Post = {
  id: string;
  userId: string;
  text: string;
  imageBase64?: string;
  createdAt: any;
  userDisplayName: string;
  userPhotoUrl?: string;
  likes?: string[];
  likesCount?: number;
  dislikes?: string[];
  dislikesCount?: number;
  commentsCount?: number;
};

const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const user = auth().currentUser;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.headerButton}
        >
          <MaterialIcon name="settings" size={24} color="white" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (!user?.uid) return;

    const authSubscriber = auth().onUserChanged((user) => {
      setUserData(user);
    });

    const postsQuery = firestore()
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(20);

    const unsubscribePosts = postsQuery.onSnapshot(async (snapshot) => {
      const allPosts = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const postData = doc.data();
          const authorDoc = await firestore().collection('users').doc(postData.userId).get();
          const authorData = authorDoc.data() || {
            displayName: 'User',
            photoBase64: null
          };

          return {
            id: doc.id,
            ...postData,
            userDisplayName: authorData.displayName,
            userPhotoUrl: authorData.photoBase64,
            likes: postData.likes || [],
            likesCount: postData.likesCount || 0,
            dislikes: postData.dislikes || [],
            dislikesCount: postData.dislikesCount || 0,
            commentsCount: postData.commentsCount || 0,
          } as Post;
        })
      );

      setPosts(allPosts);
    }, (error) => {
      console.error('Posts error:', error);
    });

    return () => {
      authSubscriber();
      unsubscribePosts();
    };
  }, [user?.uid]);

  const handleLikePost = async (postId: string) => {
    if (!user?.uid) return;

    try {
      const postRef = firestore().collection('posts').doc(postId);
      const postDoc = await postRef.get();

      if (!postDoc.exists) {
        console.log('Post does not exist');
        return;
      }

      const currentLikes = postDoc.data()?.likes || [];
      const isLiked = currentLikes.includes(user.uid);

      if (isLiked) {
        await postRef.update({
          likes: firestore.FieldValue.arrayRemove(user.uid),
          likesCount: firestore.FieldValue.increment(-1),
        });
      } else {
        await postRef.update({
          likes: firestore.FieldValue.arrayUnion(user.uid),
          likesCount: firestore.FieldValue.increment(1),
        });
        
        // Remove dislike if user was disliking the post
        const currentDislikes = postDoc.data()?.dislikes || [];
        if (currentDislikes.includes(user.uid)) {
          await postRef.update({
            dislikes: firestore.FieldValue.arrayRemove(user.uid),
            dislikesCount: firestore.FieldValue.increment(-1),
          });
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handleDislikePost = async (postId: string) => {
    if (!user?.uid) return;

    try {
      const postRef = firestore().collection('posts').doc(postId);
      const postDoc = await postRef.get();

      if (!postDoc.exists) {
        console.log('Post does not exist');
        return;
      }

      const currentDislikes = postDoc.data()?.dislikes || [];
      const isDisliked = currentDislikes.includes(user.uid);

      if (isDisliked) {
        await postRef.update({
          dislikes: firestore.FieldValue.arrayRemove(user.uid),
          dislikesCount: firestore.FieldValue.increment(-1),
        });
      } else {
        await postRef.update({
          dislikes: firestore.FieldValue.arrayUnion(user.uid),
          dislikesCount: firestore.FieldValue.increment(1),
        });
        
        // Remove like if user was liking the post
        const currentLikes = postDoc.data()?.likes || [];
        if (currentLikes.includes(user.uid)) {
          await postRef.update({
            likes: firestore.FieldValue.arrayRemove(user.uid),
            likesCount: firestore.FieldValue.increment(-1),
          });
        }
      }
    } catch (error) {
      console.error('Error disliking post:', error);
      Alert.alert('Error', 'Failed to update dislike status');
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        {item.userPhotoUrl && (
          <Image source={{ uri: item.userPhotoUrl }} style={styles.userAvatar} />
        )}
        <View style={styles.postHeaderText}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ProfileView', { userId: item.userId })}
          >
            <Text style={[styles.postAuthor, { color: '#667eea' }]}>
              {item.userDisplayName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.postTime}>
            {item.createdAt?.toDate()?.toLocaleDateString()} at {' '}
            {item.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      <Text style={styles.postText}>{item.text}</Text>
      {item.imageBase64 && (
        <Image source={{ uri: item.imageBase64 }} style={styles.postImage} />
      )}
      <View style={styles.postFooter}>
        {/* Like Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLikePost(item.id)}
        >
          <MaterialIcon
            name={item.likes?.includes(user?.uid || '') ? "favorite" : "favorite-border"}
            size={24}
            color={item.likes?.includes(user?.uid || '') ? "#ff4444" : "#666"}
          />
          <Text style={styles.actionText}>{item.likesCount || 0}</Text>
        </TouchableOpacity>

        {/* Dislike Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDislikePost(item.id)}
        >
          <MaterialIcon
            name={item.dislikes?.includes(user?.uid || '') ? "thumb-down" : "thumb-down-off-alt"}
            size={24}
            color={item.dislikes?.includes(user?.uid || '') ? "#667eea" : "#666"}
          />
          <Text style={styles.actionText}>{item.dislikesCount || 0}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CommentsScreen', {
            postId: item.id,
            postAuthor: item.userDisplayName,
            postText: item.text
          })}
        >
          <MaterialIcon name="comment" size={24} color="#666" />
          <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.header}>Welcome {userData?.displayName || user?.email}</Text>

          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.postsList}
            ListHeaderComponent={
              <>
                <Text style={styles.subHeader}>Recent posts from everyone</Text>
                <TouchableOpacity
                  style={[styles.button, styles.postButton]}
                  onPress={() => navigation.navigate('PostsScreen')}
                >
                  <MaterialIcon name="add" size={24} color="white" />
                  <Text style={styles.postButtonText}>Create Post</Text>
                </TouchableOpacity>
              </>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No posts yet. Be the first to post!</Text>
            }
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 18,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButton: {
    backgroundColor: '#667eea',
    borderWidth: 2,
    borderColor: 'white',
  },
  postButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  postsList: {
    paddingBottom: 20,
  },
  postContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postHeaderText: {
    flex: 1,
  },
  postAuthor: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  postTime: {
    color: '#666',
    fontSize: 12,
  },
  postText: {
    color: '#333',
    marginBottom: 8,
    fontSize: 15,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  postFooter: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
  },
  emptyText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  headerButton: {
    marginRight: 15,
  },
});

export default Home;