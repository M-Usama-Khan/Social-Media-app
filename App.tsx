import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { ActivityIndicator, View } from 'react-native';
import Register from './src/screens/Register';
import Login from './src/screens/Login';
import Home from './src/screens/Home';
import PostsScreen from './src/screens/PostsScreen';
import ForgotPassword from './src/screens/ForgotPassword';
import Settings from './src/screens/Settings';
import Profile from './src/screens/Profile';
import CommentsScreen from './src/screens/CommentsScreen';
import ProfileView from './src/screens/ProfileView';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  Settings: undefined;
  ProfileView: {
    userId: string;
  };
  Profile: undefined
  PostsScreen: undefined;
  CommentsScreen: {
    postId: string;
    postAuthor?: string;
    postText?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(user => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen
                name="Home"
                component={Home}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                  title: 'Home',
                }}
              />
              <Stack.Screen
                name="PostsScreen"
                component={PostsScreen}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                  title: 'Posts',
                }}
              />
              <Stack.Screen
                name="Profile"
                component={Profile}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                  title: 'Profile',
                }}
              />
              <Stack.Screen
                name="Settings"
                component={Settings}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                  title: 'Settings',
                }}
              />
              <Stack.Screen
                name="CommentsScreen"
                component={CommentsScreen}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                  title: 'Comments',
                }}
              />
              <Stack.Screen
                name="ProfileView"
                component={ProfileView}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                  title: 'Profile',
                }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={Login}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Register"
                component={Register}
                options={{
                  title: 'Create Account',
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                }}
              />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPassword}
                options={{
                  title: 'Reset Password',
                  headerStyle: { backgroundColor: '#667eea' },
                  headerTintColor: '#fff',
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;