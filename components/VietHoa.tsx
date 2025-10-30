// App.js
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Linking, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Các khóa lưu trữ (đã Việt hóa tên hiển thị)
const STORAGE_KEYS = { 
    USERS: 'danh_sach_nguoi_dung', 
    CURRENT_USER: 'nguoi_dung_hien_tai' 
};
const YEARS = [1,2,3,4];
const COURSES_BY_DEPT = { 'Quản lý Thông tin': ['Lập trình','Cơ sở dữ liệu','Phân tích hệ thống','Quản lý dự án'] };
const COURSES_BY_MBTI = {
  // Đã Việt hóa tên khóa học mẫu
  'INTJ': ['Cơ sở dữ liệu','Phân tích hệ thống'],
  'INFJ': ['Quản lý dự án','Quản trị học'],
  'INFP': ['Marketing','Quản lý tài chính'],
  'ENTP': ['Lập trình','Giải thuật'],
  'ENFP': ['Marketing','Kỹ thuật phần mềm'],
  'ISTJ': ['Hệ điều hành','Quản lý Logistics'],
  'ISFJ': ['Kinh doanh Cảng','Chuỗi cung ứng'],
  'ESTJ': ['Quản lý tài chính','Quản lý dự án']
};

const ALL_MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP', 
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

// --- HÀM HỖ TRỢ ASYNC STORAGE ---
const storeUsers = async (users) => {
    try {
        const jsonValue = JSON.stringify(users);
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, jsonValue);
    } catch (e) {
        console.error("Lỗi khi lưu danh sách người dùng:", e);
    }
};

const loadUsers = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error("Lỗi khi tải danh sách người dùng:", e);
        return [];
    }
};
// ---------------------------------

export default function App() { 
  const [loading,setLoading] = useState(true);
  const [currentUser,setCurrentUser] = useState(null);
  const [users,setUsers] = useState([]); 
  const [isLogin,setIsLogin] = useState(true);
  const [form,setForm] = useState({username:'',password:'',fullname:'',year:1});
  const [step,setStep] = useState(1);
  const [selectedCourses,setSelectedCourses] = useState([]);
  const [mbtiInput,setMbtiInput] = useState('');
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  // Thêm state để kiểm soát hiển thị lỗi đăng nhập (nếu cần hiển thị dưới input)
  const [loginError, setLoginError] = useState('');

  // --- useEffect TẢI DỮ LIỆU KHI KHỞI ĐỘNG ---
  useEffect(()=>{
    const boot = async()=>{
      try {
        const storedUsers = await loadUsers();
        setUsers(storedUsers);
      }catch(e){
        console.warn(e);
      }finally{
        setLoading(false);
      }
    }
    boot();
  },[]);
  
  // --- useEffect LƯU DỮ LIỆU MỖI KHI `users` THAY ĐỔI ---
  useEffect(() => {
    if (!loading) {
        storeUsers(users); 
    }
  }, [users]);
  // -----------------------------------------------------

  // --- Hàm kiểm tra mật khẩu ---
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Mật khẩu cần ít nhất 8 ký tự';
    }
    if (password.length > 16) {
      return 'Mật khẩu tối đa 16 ký tự';
    }
    if (!/\d/.test(password)) {
      return 'Mật khẩu phải chứa ít nhất một chữ số';
    }
    if (!/[a-z]/.test(password)) {
      return 'Mật khẩu phải chứa ít nhất một chữ cái thường';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Mật khẩu phải chứa ít nhất một chữ cái HOA';
    }
    return '';
  };

  // --- Hàm xử lý thay đổi mật khẩu ---
  const handlePasswordChange = (password) => {
    setForm({...form, password});
    const error = validatePassword(password);
    setPasswordError(error);
  };

  // --- Hàm Đăng ký ---
  const handleRegister = async()=>{
    if(!form.username.trim()||!form.password.trim()||!form.fullname.trim()){
      Alert.alert('Lỗi','Vui lòng nhập đầy đủ thông tin'); return;
    }
    
    const error = validatePassword(form.password);
    if (error) {
      Alert.alert('Lỗi', error);
      return;
    }
    
    if(users.find(u=>u.username===form.username.trim())){
      Alert.alert('Lỗi','Tài khoản đã tồn tại'); return;
    }
    
    const newUser = {
      ...form,
      id:Date.now().toString(),
      dept:'Quản lý Thông tin', 
      selectedCourses:[],
      mbti:''
    };
    const newUsers = [...users,newUser];
    
    setUsers(newUsers); 
    
    setCurrentUser(newUser);
    setSelectedCourses(newUser.selectedCourses || []);
    setMbtiInput(newUser.mbti || '');
    setForm({username:'',password:'',fullname:'',year:newUser.year}); 
    setPasswordError('');
    setIsLogin(true);
    setStep(2); 
    
    Alert.alert('Thành công','Đăng ký hoàn tất! Đã tự động đăng nhập.');
  }

  // --- Hàm Đăng nhập (ĐÃ CHỈNH SỬA) ---
  const handleLogin = async()=>{
    // Xóa thông báo lỗi trước đó
    setLoginError(''); 
    
    if(!form.username.trim()||!form.password){
        // Nếu thiếu thông tin, có thể thông báo (hoặc không, tùy chính sách)
        // Alert.alert('Lỗi','Vui lòng nhập tài khoản và mật khẩu');
        setLoginError('Vui lòng nhập tài khoản và mật khẩu');
        return;
    }
    
    const found = users.find(u=>u.username===form.username.trim()&&u.password===form.password);
    
    if(!found){
        // KHÔNG HIỂN THỊ ALERT, chỉ không làm gì và giữ nguyên màn hình
        // Tuy nhiên, có thể hiển thị lỗi ngay dưới nút Đăng nhập để người dùng biết
        setLoginError('Tài khoản hoặc mật khẩu không đúng'); 
        return;
    }

    // --- Xử lý Đăng nhập Thành công ---
    let updatedUser = {...found};
    const today = new Date();
    const currentYear = today.getFullYear();
    const schoolYear = currentYear - 2025 + 1; 
    
    // Logic tự động lên lớp
    if (schoolYear > found.year && found.year < 4) {
      updatedUser.year = found.year + 1;
      updatedUser.mbti = '';
      updatedUser.selectedCourses = [];
      Alert.alert('Thông báo', `Hệ thống đã tự động nâng lên lớp ${updatedUser.year}, vui lòng làm lại bài kiểm tra MBTI`);
      setUsers(users.map(u => u.username === updatedUser.username ? updatedUser : u));
    }
    
    setCurrentUser(updatedUser);
    setSelectedCourses(updatedUser.selectedCourses || []);
    setMbtiInput(updatedUser.mbti || '');
    setForm({username:'',password:'',fullname:'',year:updatedUser.year});
    setPasswordError('');
    setStep(2);
  }

  const handleLogout = async()=>{
    setCurrentUser(null);
    setSelectedCourses([]);
    setMbtiInput('');
    setStep(1);
    setShowQuickSelect(false);
    setPasswordError('');
    setLoginError(''); // Xóa lỗi đăng nhập khi đăng xuất
    setForm({username:'',password:'',fullname:'',year:1});
  }

  const toggleCourse = (course)=>{
    const newSelected = selectedCourses.includes(course)? selectedCourses.filter(c=>c!==course) : [...selectedCourses,course];
    setSelectedCourses(newSelected);
  }

  // --- Hàm Lưu Tiến trình ---
  const saveProgress = async()=>{
    if(!currentUser) return;
    const updated = {...currentUser,selectedCourses,mbti:mbtiInput.toUpperCase()};
    
    const updatedUsers = users.map(u=>u.username===updated.username?updated:u);
    setUsers(updatedUsers);
    setCurrentUser(updated); 
    
    Alert.alert('Thành công', 'Tiến trình đã được lưu');
  }

  // --- Hàm mở link MBTI ---
  const openMBTITest = () => {
    const url = 'https://www.16personalities.com/free-personality-test';
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
        Alert.alert(
          'Hướng dẫn kiểm tra',
          'Vui lòng hoàn thành bài kiểm tra và nhập kết quả 4 chữ cái MBTI vào ô bên dưới\nVí dụ: INFP, ENTJ, ISFJ',
          [{ text: 'Đồng ý' }]
        );
      } else {
        Alert.alert('Lỗi', 'Không thể mở trang web kiểm tra');
      }
    });
  };

  // --- Hàm Xuất PDF ---
  const handleExportPDF = () => {
    if (!currentUser) {
      Alert.alert('Lỗi', 'Không tìm thấy dữ liệu người dùng');
      return;
    }

    if (Platform.OS === 'web') {
      const mbtiCourses = COURSES_BY_MBTI[(currentUser.mbti || '').toUpperCase()] || [];
      const deptName = 'Quản lý Thông tin';
      
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${currentUser.fullname} - Báo cáo Kế hoạch Học tập</title>
          <style>
            body {
              font-family: Arial;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .section {
              margin-bottom: 20px;
            }
            .timestamp {
              text-align: right;
              margin-top: 30px;
              color: #666;
            }
            h1, h2 { color: #4ecdc4; }
            ul { list-style-type: square; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Kiểm tra Sức khỏe Hồ sơ AI - Báo cáo Kế hoạch Học tập</h1>
            <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
          </div>

          <div class="section">
            <h2>Thông tin Cơ bản</h2>
            <p><strong>Họ tên:</strong> ${currentUser.fullname}</p>
            <p><strong>Năm học:</strong> Năm ${currentUser.year}</p>
            <p><strong>Ngành:</strong> ${deptName}</p>
            <p><strong>Tính cách MBTI:</strong> ${currentUser.mbti || 'Chưa hoàn thành kiểm tra'}</p>
          </div>

          <div class="section">
            <h2>Các Khóa học Đã Chọn</h2>
            ${currentUser.selectedCourses && currentUser.selectedCourses.length > 0 
              ? `<ul>${currentUser.selectedCourses.map(course => `<li>${course}</li>`).join('')}</ul>`
              : '<p>Chưa chọn bất kỳ khóa học nào</p>'
            }
          </div>

          <div class="section">
            <h2>Khóa học Đề xuất theo MBTI</h2>
            ${mbtiCourses.length > 0 
              ? `<ul>${mbtiCourses.map(course => `<li>${course}</li>`).join('')}</ul>`
              : '<p>Chưa có khóa học đề xuất</p>'
            }
          </div>

          <div class="timestamp">
            Báo cáo này được tạo bởi Hệ thống Kiểm tra Sức khỏe Hồ sơ AI
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
    } else {
      Alert.alert('Thông báo', 'Chức năng xuất PDF hiện chỉ hỗ trợ môi trường Web.');
    }
  };

  if(loading) return <SafeAreaView style={styles.centerFull}><Text style={styles.text}>Đang tải...</Text></SafeAreaView>;

  // Màn hình Đăng nhập/Đăng ký
  if(!currentUser){
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFull}>
          <Text style={styles.brand}>Kiểm tra Sức khỏe Hồ sơ AI</Text>
          <View style={styles.cardCenter}>
            <Text style={styles.title}>{isLogin?'Đăng nhập':'Đăng ký'}</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Tài khoản" 
              placeholderTextColor="#aaa" 
              value={form.username} 
              onChangeText={t=>setForm({...form,username:t})}
            />
            
            <TextInput 
              style={[
                styles.input, 
                passwordError && !isLogin ? styles.inputError : null
              ]} 
              placeholder="Mật khẩu" 
              placeholderTextColor="#aaa" 
              secureTextEntry 
              value={form.password} 
              onChangeText={handlePasswordChange}
            />
            
            {passwordError && !isLogin ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : (
              <Text style={styles.passwordHint}>
                {!isLogin ? 'Yêu cầu mật khẩu: 8-16 ký tự, bao gồm số, chữ hoa/thường' : ''}
              </Text>
            )}

            {!isLogin && (
              <>
                <TextInput 
                  style={styles.input} 
                  placeholder="Họ và tên" 
                  placeholderTextColor="#aaa" 
                  value={form.fullname} 
                  onChangeText={t=>setForm({...form,fullname:t})}
                />
                <Text style={[styles.text,{marginTop:4}]}>Ngành: Quản lý Thông tin</Text>
                <Text style={[styles.text,{marginBottom:4}]}>Năm học:</Text>
                <View style={{flexDirection:'row',justifyContent:'center',marginBottom:8}}>
                  {YEARS.map(y=>
                    <TouchableOpacity 
                      key={y} 
                      onPress={()=>setForm({...form,year:y})} 
                      style={{
                        marginHorizontal:6,
                        paddingVertical:6,
                        paddingHorizontal:12,
                        backgroundColor: form.year===y?'#4ecdc4':'#333',
                        borderRadius:8
                      }}
                    >
                      <Text style={{color:'#fff',fontWeight:'700'}}>{y}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
            
            <TouchableOpacity 
              style={[
                styles.primaryBtn, 
                passwordError && !isLogin ? styles.disabledBtn : null
              ]} 
              onPress={isLogin?handleLogin:handleRegister}
              disabled={passwordError && !isLogin}
            >
              <Text style={styles.primaryBtnText}>{isLogin?'Đăng nhập':'Đăng ký'}</Text>
            </TouchableOpacity>
            
            {/* Hiển thị lỗi đăng nhập (chỉ khi ở chế độ Đăng nhập) */}
            {isLogin && loginError ? (
                <Text style={[styles.errorText, {marginTop: 8}]}>{loginError}</Text>
            ) : null}
            
            <TouchableOpacity 
              style={{marginTop:12}} 
              onPress={()=>{
                setIsLogin(!isLogin); 
                setForm({username:'',password:'',fullname:'',year:1});
                setPasswordError('');
                setLoginError(''); // Xóa lỗi khi chuyển đổi chế độ
              }}
            >
              <Text style={styles.ghostBtnText}>
                {isLogin?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const courseList = COURSES_BY_DEPT['Quản lý Thông tin'];
  const mbtiCourses = currentUser.mbti? (COURSES_BY_MBTI[currentUser.mbti.toUpperCase()]||[]) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{alignItems:'center',padding:16}}>
        <Text style={styles.welcome}>Chào mừng {currentUser.fullname}</Text>
        <TouchableOpacity onPress={handleLogout}><Text style={styles.logout}>Đăng xuất</Text></TouchableOpacity>
        

        {/* Step 1: Thông tin Cơ bản */}
        {step===1 && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin</Text>
          <Text style={styles.text}>Họ tên: {currentUser.fullname}</Text>
          <Text style={styles.text}>Ngành: Quản lý Thông tin</Text>
          <Text style={styles.text}>Năm học: {currentUser.year}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(2)}><Text style={styles.primaryBtnText}>Tiếp theo → MBTI</Text></TouchableOpacity>
        </View>}

        {/* Step 2: MBTI */}
        {step===2 && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kiểm tra Tính cách (MBTI)</Text>
          
          {/* Nút mở link MBTI */}
          <TouchableOpacity 
            style={[styles.primaryBtn, {backgroundColor: '#667eea'}]} 
            onPress={openMBTITest}
          >
            <Text style={styles.primaryBtnText}>🌐 Bắt đầu kiểm tra MBTI</Text>
          </TouchableOpacity>

          <Text style={[styles.text, {marginVertical: 16}]}>Hoặc</Text>

          {/* Quick Select */}
          <TouchableOpacity 
            style={[styles.primaryBtn, {backgroundColor: '#4ecdc4'}]}
            onPress={() => setShowQuickSelect(!showQuickSelect)}
          >
            <Text style={styles.primaryBtnText}>⚡ Chọn nhanh loại hình</Text>
          </TouchableOpacity>

          {/* Quick Select Grid */}
          {showQuickSelect && (
            <View style={styles.quickSelectContainer}>
              <Text style={[styles.text, {marginBottom: 12}]}>Chọn loại MBTI:</Text>
              <View style={styles.quickSelectGrid}>
                {ALL_MBTI_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.quickSelectBtn,
                      mbtiInput.toUpperCase() === type && styles.quickSelectBtnActive
                    ]}
                    onPress={() => {
                      setMbtiInput(type);
                      setShowQuickSelect(false);
                    }}
                  >
                    <Text style={[
                      styles.quickSelectText,
                      mbtiInput.toUpperCase() === type && styles.quickSelectTextActive
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* MBTI Result Input */}
          <Text style={[styles.text,{marginTop:16, marginBottom: 8}]}>Nhập kết quả MBTI:</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Nhập 4 chữ cái" 
            value={mbtiInput}
            onChangeText={setMbtiInput}
            autoCapitalize="characters"
            maxLength={4}
          />

          {mbtiInput && (
            <Text style={[styles.text, {color: '#4ecdc4', marginTop: 8}]}>
              Hiện tại: {mbtiInput.toUpperCase()}
            </Text>
          )}

          {/* Navigation Buttons */}
          <TouchableOpacity 
            style={[styles.primaryBtn, {backgroundColor:'#ffb347', marginTop: 16}]} 
            onPress={()=>{
                if (mbtiInput.length === 4) {
                  saveProgress();
                  setStep(4); 
                } else {
                  Alert.alert('Thông báo', 'Vui lòng nhập kết quả MBTI');
                }
            }}
          >
              <Text style={styles.primaryBtnText}>Xem Kết quả</Text>
          </TouchableOpacity>

          <View style={{flexDirection:'row', justifyContent:'space-between', width:'100%', marginTop:12}}>
            <TouchableOpacity style={[styles.primaryBtn,{backgroundColor:'#555',flex:1,marginRight:6}]} onPress={()=>setStep(1)}>
              <Text style={styles.primaryBtnText}>← Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.primaryBtn,{flex:1,marginLeft:6}]} 
              onPress={()=>{
                if (mbtiInput.length === 4) {
                    saveProgress();
                    setStep(3);
                } else {
                    Alert.alert('Thông báo', 'Vui lòng nhập kết quả MBTI');
                } 
              }}>
              <Text style={styles.primaryBtnText}>Tiếp theo →</Text>
            </TouchableOpacity>
          </View>
        </View>}

        {/* Step 3: Chọn khóa học */}
        {step===3 && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn Khóa học</Text>
          {courseList.map(c=><TouchableOpacity key={c} style={[styles.courseBtn, selectedCourses.includes(c)?styles.courseBtnSelected:null]} onPress={()=>toggleCourse(c)}><Text style={selectedCourses.includes(c)?styles.courseBtnTextSelected:styles.courseBtnText}>{c}</Text></TouchableOpacity>)}
          <View style={{flexDirection:'row', justifyContent:'space-between', width:'100%', marginTop:12}}>
            <TouchableOpacity style={[styles.primaryBtn,{backgroundColor:'#555',flex:1,marginRight:6}]} onPress={()=>setStep(2)}>
              <Text style={styles.primaryBtnText}>← Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn,{flex:1,marginLeft:6}]} onPress={()=>{saveProgress(); setStep(4)}}>
              <Text style={styles.primaryBtnText}>Hoàn tất →</Text>
            </TouchableOpacity>
          </View>
        </View>}

        {/* Step 4: Kết quả */}
        {step===4 && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kết quả Phân tích</Text>

          {/* Thông tin cơ bản */}
          <View style={styles.infoCard}>
            <Text style={styles.infoText}><Text style={{fontWeight:'700'}}>Họ tên:</Text> {currentUser.fullname}</Text>
            <Text style={styles.infoText}><Text style={{fontWeight:'700'}}>Năm học:</Text> {currentUser.year}</Text>
            <Text style={styles.infoText}><Text style={{fontWeight:'700'}}>MBTI:</Text> {currentUser.mbti || 'Chưa kiểm tra'}</Text>
          </View>

          {/* Khóa học đã chọn */}
          <View style={styles.infoCard}>
            <Text style={[styles.infoText, {fontWeight:'700', marginBottom: 8}]}>Khóa học Đã Chọn:</Text>
            {selectedCourses.length > 0 ? (
              selectedCourses.map((course, index) => (
                <Text key={`sel-${index}`} style={styles.infoText}>• {course}</Text>
              ))
            ) : (
              <Text style={[styles.infoText, {color: '#666'}]}>Không có</Text>
            )}
          </View>

          {/* Khóa học đề xuất theo MBTI */}
          <View style={styles.infoCard}>
            <Text style={[styles.infoText, {fontWeight:'700', marginBottom: 8}]}>Khóa học Đề xuất:</Text>
            {mbtiCourses.length > 0 ? (
              mbtiCourses.map((course, index) => (
                <Text key={`mbti-${index}`} style={styles.infoText}>• {course}</Text>
              ))
            ) : (
              <Text style={[styles.infoText, {color: '#666'}]}>Không có đề xuất (Vui lòng hoàn thành MBTI)</Text>
            )}
          </View>

          {/* Nút Export */}
          <TouchableOpacity 
            style={[styles.primaryBtn, {backgroundColor:'#ff6b6b', marginTop: 20}]} 
            onPress={handleExportPDF}
          >
            <Text style={styles.primaryBtnText}>📄 Xuất PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.primaryBtn,{marginTop:12, backgroundColor:'#555'}]} 
            onPress={()=>setStep(3)}
          >
            <Text style={styles.primaryBtnText}>← Quay lại</Text>
          </TouchableOpacity>
        </View>}

        <View style={{height:40}}/>
      </ScrollView>
    </SafeAreaView>
  )
} 

// Styles (Giữ nguyên tên tiếng Anh cho dễ debug, nhưng giá trị vẫn áp dụng)
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#121212'},
  centerFull:{flex:1,justifyContent:'center',alignItems:'center',padding:16},
  brand:{fontSize:28,fontWeight:'700',marginBottom:16,textAlign:'center',color:'#4ecdc4'},
  cardCenter:{backgroundColor:'#1f1f1f',padding:20,borderRadius:12,alignItems:'center',width:'85%'},
  title:{fontSize:22,fontWeight:'700',marginBottom:16,color:'#fff',textAlign:'center'},
  input:{
    borderWidth:1,
    borderColor:'#555',
    backgroundColor:'#222',
    padding:12,
    borderRadius:8,
    marginBottom:8,
    width:'100%',
    textAlign:'center',
    color:'#fff'
  },
  inputError:{
    borderColor:'#ff6b6b',
    borderWidth:2,
  },
  primaryBtn:{
    backgroundColor:'#4ecdc4',
    paddingVertical:12,
    borderRadius:10,
    alignItems:'center',
    marginTop:8,
    width:'100%'
  },
  disabledBtn:{
    backgroundColor:'#666',
    opacity:0.6
  },
  primaryBtnText:{color:'#fff',fontWeight:'700',fontSize:16,textAlign:'center'},
  ghostBtnText:{color:'#4ecdc4',fontWeight:'600',fontSize:14,textAlign:'center'},
  welcome:{fontSize:20,fontWeight:'700',marginBottom:8,textAlign:'center',color:'#fff'},
  logout:{color:'#ff5252',fontWeight:'700',fontSize:14,marginBottom:16},
  section:{backgroundColor:'#1f1f1f',padding:16,borderRadius:12,marginBottom:16,alignItems:'center',width:'100%'},
  sectionTitle:{fontSize:18,fontWeight:'700',marginBottom:12,color:'#fff'},
  text:{fontSize:16,marginBottom:4,textAlign:'center',color:'#fff'},
  errorText:{
    color:'#ff6b6b',
    fontSize:12,
    textAlign:'center',
    marginBottom:8,
    width:'100%'
  },
  passwordHint:{
    color:'#aaa',
    fontSize:12,
    textAlign:'center',
    marginBottom:8,
    width:'100%'
  },
  courseBtn:{paddingVertical:8,paddingHorizontal:16,borderRadius:20,borderWidth:1,borderColor:'#555',marginVertical:4,backgroundColor:'#222',width:200,alignItems:'center'},
  courseBtnSelected:{backgroundColor:'#4ecdc4',borderColor:'#4ecdc4'},
  courseBtnText:{color:'#fff',fontSize:16},
  courseBtnTextSelected:{color:'#fff',fontSize:16},
  // Info Card Styles
  infoCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 6,
    color: '#fff',
    lineHeight: 20
  },
  // Quick Select Styles
  quickSelectContainer: {
    width: '100%',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickSelectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  quickSelectBtnActive: {
    backgroundColor: '#4ecdc4',
  },
  quickSelectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickSelectTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});