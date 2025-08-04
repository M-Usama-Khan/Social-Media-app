import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type CommentsScreenRouteProp = RouteProp<RootStackParamList, 'CommentsScreen'>;

interface CommentsScreenProps {
  route: CommentsScreenRouteProp;
}

type Comment = {
  id: string;
  userId: string;
  text: string;
  createdAt: any;
  userDisplayName: string;
  userPhotoUrl?: string;
};

const CommentsScreen: React.FC<CommentsScreenProps> =({ route }) => {
  const { postId } = route.params;
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    const commentsQuery = firestore()
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'asc');

    const unsubscribe = commentsQuery.onSnapshot(async (snapshot) => {
      const commentsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const commentData = doc.data();
          const userDoc = await firestore().collection('users').doc(commentData.userId).get();
          const userData = userDoc.data() || { displayName: 'User', photoBase64: null };

          return {
            id: doc.id,
            ...commentData,
            userDisplayName: userData.displayName,
            userPhotoUrl: userData.photoBase64,
          } as Comment;
        })
      );
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.uid) return;

    setIsLoading(true);
    try {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data() || { displayName: 'You', photoBase64: null };

      // Add comment
      await firestore()
        .collection('posts')
        .doc(postId)
        .collection('comments')
        .add({
          userId: user.uid,
          text: newComment,
          userDisplayName: userData.displayName,
          userPhotoUrl: userData.photoBase64,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      // Update comments count
      await firestore()
        .collection('posts')
        .doc(postId)
        .update({
          commentsCount: firestore.FieldValue.increment(1),
        });

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setIsLoading(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        {item.userPhotoUrl && (
          <Image source={{ uri: item.userPhotoUrl }} style={styles.commentAvatar} />
        )}
        <View style={styles.commentContent}>
          <Text style={styles.commentAuthor}>{item.userDisplayName}</Text>
          <Text style={styles.commentText}>{item.text}</Text>
          <Text style={styles.commentTime}>
            {item.createdAt?.toDate()?.toLocaleDateString()} at {' '}
            {item.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.commentsList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
            }
          />
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#999"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              style={styles.commentButton}
              onPress={handleAddComment}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialIcon name="send" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
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
    padding: 16,
  },
  commentsList: {
    paddingBottom: 80,
  },
  commentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
  },
  commentText: {
    color: '#333',
    fontSize: 14,
    marginVertical: 4,
  },
  commentTime: {
    color: '#666',
    fontSize: 12,
  },
  emptyText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    color: '#333',
    fontSize: 14,
  },
  commentButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default CommentsScreen;