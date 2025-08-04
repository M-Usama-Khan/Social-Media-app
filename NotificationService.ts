import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';

export const requestUserPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      await getFCMToken();
    }
    return enabled;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    
    // Save the token to the user's document in Firestore
    const currentUser = auth().currentUser;
    if (currentUser) {
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          fcmToken: token,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    }
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const sendPushNotification = async (
  recipientUserId: string,
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    // Get recipient's FCM token
    const recipientDoc = await firestore()
      .collection('users')
      .doc(recipientUserId)
      .get();

    const recipientData = recipientDoc.data();
    const token = recipientData?.fcmToken;

    if (!token) {
      console.log('Recipient has no FCM token');
      return false;
    }

    // In a real app, you would call a Cloud Function to send the notification
    console.log('Sending notification to:', recipientUserId, 'Title:', title, 'Body:', body);
    
    // For demo purposes, we'll just log it
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

// Handle foreground notifications
export const setupForegroundNotifications = (navigation: any) => {
  return messaging().onMessage(async remoteMessage => {
    console.log('Foreground notification:', remoteMessage);
    Alert.alert(
      remoteMessage.notification?.title || 'Notification',
      remoteMessage.notification?.body,
      [
        {
          text: 'OK',
          onPress: () => {
            if (remoteMessage.data?.postId) {
              navigation.navigate('CommentsScreen', {
                postId: remoteMessage.data.postId
              });
            }
          }
        }
      ]
    );
  });
};

// Handle background/quit state notifications
export const setupBackgroundNotifications = (navigation: any) => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background notification:', remoteMessage);
  });

  // Check if app was opened from a notification
  messaging().getInitialNotification().then(remoteMessage => {
    if (remoteMessage) {
      console.log('App opened from notification:', remoteMessage);
      if (remoteMessage.data?.postId) {
        navigation.navigate('CommentsScreen', {
          postId: remoteMessage.data.postId
        });
      }
    }
  });

  return messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification opened:', remoteMessage);
    if (remoteMessage.data?.postId) {
      navigation.navigate('CommentsScreen', {
        postId: remoteMessage.data.postId
      });
    }
  });
};

// Remove FCM token on logout
export const removeFCMToken = async () => {
  try {
    const currentUser = auth().currentUser;
    if (currentUser) {
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          fcmToken: firestore.FieldValue.delete(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    }
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};