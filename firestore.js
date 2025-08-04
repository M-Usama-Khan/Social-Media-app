import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

const db = firestore();

// User operations
export const getUserProfile = async (userId) => {
  try {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, data) => {
  try {
    await db.collection('users').doc(userId).update({
      ...data,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const createUserProfile = async (userId, data) => {
  try {
    await db.collection('users').doc(userId).set({
      ...data,
      fcmToken: null, // Add fcmToken field
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Post operations
export const getPosts = async (limit = 20) => {
  try {
    const snapshot = await db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
};

export const createPost = async (postData) => {
  try {
    const postRef = await db.collection('posts').add({
      ...postData,
      likes: [], // Ensure likes array exists
      likesCount: 0, // Ensure likesCount exists
      commentsCount: 0, // Ensure commentsCount exists
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return postRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

export const deletePost = async (postId) => {
  try {
    await db.collection('posts').doc(postId).delete();
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// Real-time listeners
export const onPostsUpdate = (callback, limit = 20) => {
  return db.collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .onSnapshot(snapshot => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(posts);
    }, error => {
      console.error('Posts update error:', error);
    });
};

// Image upload
export const uploadImage = async (path, imageUri) => {
  try {
    const reference = storage().ref(path);
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError('Network request failed'));
      xhr.responseType = 'blob';
      xhr.open('GET', imageUri, true);
      xhr.send(null);
    });

    await reference.put(blob);
    return await reference.getDownloadURL();
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Follow operations
export const followUser = async (followerId, followingId) => {
  try {
    await db.collection('followers').doc(`${followerId}_${followingId}`).set({
      followerId,
      followingId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

export const unfollowUser = async (followerId, followingId) => {
  try {
    await db.collection('followers').doc(`${followerId}_${followingId}`).delete();
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

export const checkIfFollowing = async (followerId, followingId) => {
  try {
    const doc = await db.collection('followers').doc(`${followerId}_${followingId}`).get();
    return doc.exists;
  } catch (error) {
    console.error('Error checking follow status:', error);
    throw error;
  }
};