import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { launchImageLibrary } from 'react-native-image-picker';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const Profile = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const user = auth().currentUser;
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        (doc) => {
          const data = doc.data();
          setDisplayName(data?.displayName || '');
          setBio(data?.bio || '');
          setProfileImage(data?.photoBase64 || null);
        }
      );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleImageUpload = async () => {
    setIsImageLoading(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.3,
        maxWidth: 400,
        maxHeight: 400,
      });

      if (result.didCancel) return;
      if (!result.assets?.[0]?.uri) return;

      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const base64Image = await convertBlobToBase64(blob);

      setProfileImage(base64Image);
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      await firestore().collection('users').doc(user?.uid).set({
        displayName: displayName.trim(),
        bio: bio,
        photoBase64: profileImage,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await user?.updateProfile({
        displayName: displayName.trim()
      });

      await auth().currentUser?.reload();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Profile</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handleImageUpload} disabled={isImageLoading}>
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialIcon name="person" size={50} color="#667eea" />
                </View>
              )}
              {isImageLoading ? (
                <ActivityIndicator style={styles.imageLoadingIndicator} color="#667eea" />
              ) : (
                <Text style={styles.changePhotoText}>Change Photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcon
              name="person"
              size={24}
              color="#667eea"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor="#999"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcon
              name="email"
              size={24}
              color="#667eea"
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ''}
              editable={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcon
              name="info"
              size={24}
              color="#667eea"
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about yourself"
              placeholderTextColor="#999"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Update Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: '100%',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#667eea',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#667eea',
  },
  changePhotoText: {
    marginTop: 10,
    color: '#667eea',
    fontWeight: '500',
  },
  imageLoadingIndicator: {
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 15,
  },
  disabledInput: {
    opacity: 0.7,
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Profile;