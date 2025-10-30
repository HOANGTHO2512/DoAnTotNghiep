import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VietHoa from '../components/VietHoa';
import DaiLoan from '../components/DaiLoan';
const Stack = createNativeStackNavigator();
export default function App() {
  return (
      <Stack.Navigator initialRouteName="VietHoa">
        <Stack.Screen name="VietHoa" component={VietHoa} />
        <Stack.Screen name="DaiLoan" component={DaiLoan} />
      </Stack.Navigator>
  );
}

