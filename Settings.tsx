import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import { getUserProfile } from '../database/firestore';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

const Settings = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const user = auth().currentUser;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.uid) {
        try {
          const profileData = await getUserProfile(user.uid);
          setProfile(profileData);
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    };
    
    loadProfile();
  }, [user]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: '#667eea',
      },
      headerTintColor: '#fff',
    });
  }, [navigation]);

  const menuItems = [
    {
      title: 'Profile',
      icon: 'person',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      title: 'Change Password',
      icon: 'lock',
      onPress: () => navigation.navigate('ForgotPassword'),
    },
    {
      title: 'Privacy Policy',
      icon: 'privacy-tip',
      onPress: () => Alert.alert('Privacy Policy', 'Our privacy policy information would appear here'),
    },
    {
      title: 'Terms of Service',
      icon: 'description',
      onPress: () => Alert.alert('Terms of Service', 'Our terms of service would appear here'),
    },
    {
      title: 'Logout',
      icon: 'logout',
      onPress: () => {
        auth().signOut();
        navigation.replace('Login');
      },
    },
  ];

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          
          {profile?.displayName && (
            <Text style={styles.userName}>{profile.displayName}</Text>
          )}
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <MaterialIcon name={item.icon} size={24} color="#667eea" />
              <Text style={styles.menuText}>{item.title}</Text>
              <MaterialIcon
                name="chevron-right"
                size={24}
                color="#999"
                style={styles.chevron}
              />
            </TouchableOpacity>
          ))}
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
  },
  header: {
    marginBottom: 30,
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
  userName: {
    fontSize: 18,
    color: 'white',
    marginTop: 5,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  chevron: {
    marginLeft: 'auto',
  },
});

export default Settings;