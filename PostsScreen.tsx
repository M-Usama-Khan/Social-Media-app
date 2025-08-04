import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import ImageResizer from 'react-native-image-resizer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

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
  commentsCount?: number;
};

const PostsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState('');

  const user = auth().currentUser;
  const db = firestore();

  useEffect(() => {
    if (!user?.uid) return;

    const postsQuery = db.collection('posts')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20);

    const unsubscribe = postsQuery.onSnapshot(async (snapshot) => {
      const userPosts = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const postData = doc.data();
          
          const userDoc = await db.collection('users').doc(user.uid).get();
          const userData = userDoc.data() || { 
            displayName: user?.displayName || 'You', 
            photoBase64: null 
          };

          return {
            id: doc.id,
            ...postData,
            userDisplayName: userData.displayName,
            userPhotoUrl: userData.photoBase64,
            likes: postData.likes || [],
            likesCount: postData.likesCount || 0,
            commentsCount: postData.commentsCount || 0,
          } as Post;
        })
      );

      setPosts(userPosts);
    }, (error) => {
      console.error('Posts update error:', error);
      
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleImageUpload = async () => {
    setIsImageUploading(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.5,
      });

      if (result.didCancel) return;
      if (!result.assets?.[0]?.uri) return;

      const compressedImage = await ImageResizer.createResizedImage(
        result.assets[0].uri,
        800,
        800,
        'JPEG',
        70,
        0,
        undefined,
        false
      );

      setPostImage(compressedImage.uri);
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim()) {
      Alert.alert('Error', 'Post text cannot be empty');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    setIsLoading(true);
    
    try {
      let imageBase64 = null;
      
      if (postImage) {
        const response = await fetch(postImage);
        const blob = await response.blob();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data() || { 
        displayName: user?.displayName || 'You', 
        photoBase64: null 
      };

      await db.collection('posts').add({
        userId: user.uid,
        text: newPostText,
        imageBase64: imageBase64 || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        userDisplayName: userData.displayName,
        userPhotoUrl: userData.photoBase64,
        likes: [],
        likesCount: 0,
        commentsCount: 0,
      });

      setNewPostText('');
      setPostImage(null);
    } catch (error) {
      console.error('Post creation error:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPost = async () => {
    if (!editingPost || !editText.trim()) return;

    setIsLoading(true);
    try {
      await db.collection('posts').doc(editingPost.id).update({
        text: editText,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setEditingPost(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing post:', error);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await db.collection('posts').doc(postId).delete();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleLikePost = async (postId: string) => {
    if (!user?.uid) return;

    try {
      const postRef = db.collection('posts').doc(postId);
      const postDoc = await postRef.get();
      const postData = postDoc.data();

      const currentLikes = postData?.likes || [];
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
      }
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const renderPost = ({ item }: { item: Post }) => {

    const isLiked = item.likes?.includes(user?.uid || '');
    return(
    
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        {item.userPhotoUrl && (
          <Image source={{ uri: item.userPhotoUrl }} style={styles.userAvatar} />
        )}
        <View style={styles.postHeaderText}>
          <Text style={styles.postAuthor}>{item.userDisplayName}</Text>
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

      <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLikePost(item.id)}
        >
          <MaterialIcon 
            name={isLiked ? "favorite" : "favorite-border"} 
            size={24} 
            color={isLiked ? "#ff4444" : "#666"} 
          />
          <Text style={styles.actionText}>{item.likesCount || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => handleLikePost(item.id)}
        >
          <MaterialIcon 
            name={item.likes?.includes(user?.uid || '') ? "favorite" : "favorite-border"} 
            size={24} 
            color={item.likes?.includes(user?.uid || '') ? "#ff4444" : "#666"} 
          />
          <Text style={styles.likeCountText}>{item.likesCount || 0}</Text>
        </TouchableOpacity>
       
<TouchableOpacity 
  style={styles.actionButton}
  onPress={() => navigation.navigate('CommentsScreen', { 
    postId: item.id,
    postAuthor: item.userDisplayName, // Optional: pass additional data if needed
    postText: item.text
  })}
>
  <MaterialIcon name="comment" size={24} color="#666" />
  <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
</TouchableOpacity>
        <View style={styles.postActions}>
          <TouchableOpacity onPress={() => {
            setEditingPost(item);
            setEditText(item.text);
          }}>
            <MaterialIcon name="edit" size={20} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
            <MaterialIcon name="delete" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
        }
  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.createPostContainer}>
          <TextInput
            style={styles.postInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            multiline
            value={newPostText}
            onChangeText={setNewPostText}
          />
          
          <View style={styles.postActions}>
            <TouchableOpacity 
              onPress={handleImageUpload} 
              disabled={isImageUploading}
              style={styles.imageButton}
            >
              {isImageUploading ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <>
                  <MaterialIcon name="image" size={24} color="#667eea" />
                  <Text style={styles.imageButtonText}>Add Image</Text>
                </>
              )}
            </TouchableOpacity>
            
            {postImage && (
              <Image source={{ uri: postImage }} style={styles.previewImage} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.postButton, isLoading && styles.buttonDisabled]}
            onPress={handleCreatePost}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setPosts([]);
                setRefreshing(false);
              }}
              colors={['#667eea']}
              tintColor="#667eea"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>You haven't created any posts yet!</Text>
          }
        />

        <Modal
          visible={!!editingPost}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingPost(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TextInput
                style={styles.editInput}
                multiline
                value={editText}
                onChangeText={setEditText}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditingPost(null)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleEditPost}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  createPostContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postInput: {
    minHeight: 80,
    maxHeight: 150,
    color: '#333',
    fontSize: 16,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#667eea',
    marginRight: 8,
  },
  imageButtonText: {
    color: '#667eea',
    marginLeft: 4,
    fontSize: 14,
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  postButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
    color: '#333',
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
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  likeCountText: {
    marginLeft: 4,
    color: '#666',
  },
  commentCountText: {
    marginLeft: 4,
    color: '#666',
  },
  postAction: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 10,
  },
  emptyText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  editInput: {
    minHeight: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PostsScreen;