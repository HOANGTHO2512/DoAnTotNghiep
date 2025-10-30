// App.js
import React, { useState, useEffect } from 'react';
import {
    SafeAreaView, View, Text, TextInput, TouchableOpacity,
    ScrollView, StyleSheet, Alert, Linking, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 儲存金鑰 (已翻譯)
const STORAGE_KEYS = { 
    USERS: '使用者清單', 
    CURRENT_USER: '目前使用者' 
};
const YEARS = [1,2,3,4]; // 年級
const COURSES_BY_DEPT = { '資訊管理': ['程式設計','資料庫','系統分析','專案管理'] }; // 資訊管理系課程
const COURSES_BY_MBTI = {
    // MBTI 性格類型建議課程 (已翻譯)
    'INTJ': ['資料庫','系統分析'],
    'INFJ': ['專案管理','管理學'],
    'INFP': ['行銷學','財務管理'],
    'ENTP': ['程式設計','演算法'],
    'ENFP': ['行銷學','軟體工程'],
    'ISTJ': ['作業系統','物流管理'],
    'ISFJ': ['港口經營','供應鏈管理'],
    'ESTJ': ['財務管理','專案管理'],
    'ESFJ': ['人力資源','組織行為']
};

const ALL_MBTI_TYPES = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP', 
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

// --- ASYNC STORAGE 輔助函數 ---
const storeUsers = async (users) => {
    try {
        const jsonValue = JSON.stringify(users);
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, jsonValue);
    } catch (e) {
        console.error("儲存使用者清單時發生錯誤:", e);
    }
};

const loadUsers = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error("載入使用者清單時發生錯誤:", e);
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
    // 儲存登入錯誤訊息
    const [loginError, setLoginError] = useState('');

    // --- useEffect 啟動時載入資料 ---
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
    
    // --- useEffect 每當 `users` 變動時儲存資料 ---
    useEffect(() => {
        if (!loading) {
            storeUsers(users); 
        }
    }, [users]);
    // -----------------------------------------------------

    // --- 密碼驗證函數 ---
    const validatePassword = (password) => {
        if (password.length < 8) {
            return '密碼需要至少 8 個字元';
        }
        if (password.length > 16) {
            return '密碼最多 16 個字元';
        }
        if (!/\d/.test(password)) {
            return '密碼必須包含至少一個數字';
        }
        if (!/[a-z]/.test(password)) {
            return '密碼必須包含至少一個小寫字母';
        }
        if (!/[A-Z]/.test(password)) {
            return '密碼必須包含至少一個大寫字母';
        }
        return '';
    };

    // --- 處理密碼變動 ---
    const handlePasswordChange = (password) => {
        setForm({...form, password});
        const error = validatePassword(password);
        setPasswordError(error);
        if (isLogin) setLoginError(''); // 清除登入錯誤
    };

    // --- 註冊函數 ---
    const handleRegister = async()=>{
        if(!form.username.trim()||!form.password.trim()||!form.fullname.trim()){
            Alert.alert('錯誤','請輸入所有必填資訊'); return;
        }
        
        const error = validatePassword(form.password);
        if (error) {
            Alert.alert('錯誤', error);
            return;
        }
        
        if(users.find(u=>u.username===form.username.trim())){
            Alert.alert('錯誤','帳號已存在'); return;
        }
        
        const newUser = {
            ...form,
            id:Date.now().toString(),
            dept:'資訊管理', 
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
        setLoginError('');
        setIsLogin(true); // 註冊成功後通常跳轉到主頁或下一步
        setStep(2); 
        
        Alert.alert('成功','註冊完成！已自動登入。');
    }

    // --- 登入函數 ---
    const handleLogin = async()=>{
        // 清除先前的錯誤訊息
        setLoginError(''); 
        
        if(!form.username.trim()||!form.password){
            setLoginError('請輸入帳號和密碼');
            return;
        }
        
        const found = users.find(u=>u.username===form.username.trim()&&u.password===form.password);
        
        if(!found){
            // 顯示錯誤訊息在輸入框下方
            setLoginError('帳號或密碼不正確'); 
            return;
        }

        // --- 處理成功登入 ---
        let updatedUser = {...found};
        const today = new Date();
        const currentYear = today.getFullYear();
        // 假設應用程式在 2025 年開始使用
        const schoolYear = currentYear - 2025 + 1; 
        
        // 自動升級邏輯 (假設最多四年級)
        if (schoolYear > found.year && found.year < 4) {
            updatedUser.year = found.year + 1;
            updatedUser.mbti = ''; // 升級後重設 MBTI
            updatedUser.selectedCourses = []; // 重設已選課程
            Alert.alert('通知', `系統已自動升上 ${updatedUser.year} 年級，請重新進行 MBTI 測驗`);
            setUsers(users.map(u => u.username === updatedUser.username ? updatedUser : u));
        }
        
        setCurrentUser(updatedUser);
        setSelectedCourses(updatedUser.selectedCourses || []);
        setMbtiInput(updatedUser.mbti || '');
        setForm({username:'',password:'',fullname:'',year:updatedUser.year});
        setPasswordError('');
        setLoginError('');
        setStep(2);
    }

    const handleLogout = async()=>{
        setCurrentUser(null);
        setSelectedCourses([]);
        setMbtiInput('');
        setStep(1);
        setShowQuickSelect(false);
        setPasswordError('');
        setLoginError(''); // 清除登入錯誤訊息
        setForm({username:'',password:'',fullname:'',year:1});
    }

    const toggleCourse = (course)=>{
        const newSelected = selectedCourses.includes(course)? selectedCourses.filter(c=>c!==course) : [...selectedCourses,course];
        setSelectedCourses(newSelected);
    }

    // --- 儲存進度函數 ---
    const saveProgress = async()=>{
        if(!currentUser) return;
        const updated = {...currentUser,selectedCourses,mbti:mbtiInput.toUpperCase()};
        
        const updatedUsers = users.map(u=>u.username===updated.username?updated:u);
        setUsers(updatedUsers);
        setCurrentUser(updated); 
        
        Alert.alert('成功', '進度已儲存');
    }

    // --- 開啟 MBTI 連結 ---
    const openMBTITest = () => {
        const url = 'https://www.16personalities.com/free-personality-test';
        
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
                Alert.alert(
                    '測驗說明',
                    '請完成測驗並將 4 個字母的 MBTI 結果輸入下方欄位\n範例: INFP, ENTJ, ISFJ',
                    [{ text: '確定' }]
                );
            } else {
                Alert.alert('錯誤', '無法開啟 MBTI 測驗網頁');
            }
        });
    };

    // --- 匯出 PDF 函數 (Web Only) ---
    const handleExportPDF = () => {
        if (!currentUser) {
            Alert.alert('錯誤', '找不到使用者資料');
            return;
        }

        if (Platform.OS === 'web') {
            const mbtiCourses = COURSES_BY_MBTI[(currentUser.mbti || '').toUpperCase()] || [];
            const deptName = '資訊管理';
            
            const pdfContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${currentUser.fullname} - 學習計畫報告</title>
                    <style>
                        body {
                            font-family: Arial, "Microsoft JhengHei", sans-serif; /* 支援中文字體 */
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
                        <h1>AI 個人檔案健康檢查 - 學習計畫報告</h1>
                        <p>建立時間: ${new Date().toLocaleString('zh-TW')}</p>
                    </div>

                    <div class="section">
                        <h2>基本資訊</h2>
                        <p><strong>姓名:</strong> ${currentUser.fullname}</p>
                        <p><strong>年級:</strong> ${currentUser.year} 年級</p>
                        <p><strong>系所:</strong> ${deptName}</p>
                        <p><strong>MBTI 性格:</strong> ${currentUser.mbti || '尚未完成測驗'}</p>
                    </div>

                    <div class="section">
                        <h2>已選擇課程</h2>
                        ${currentUser.selectedCourses && currentUser.selectedCourses.length > 0 
                            ? `<ul>${currentUser.selectedCourses.map(course => `<li>${course}</li>`).join('')}</ul>`
                            : '<p>尚未選擇任何課程</p>'
                        }
                    </div>

                    <div class="section">
                        <h2>MBTI 建議課程</h2>
                        ${mbtiCourses.length > 0 
                            ? `<ul>${mbtiCourses.map(course => `<li>${course}</li>`).join('')}</ul>`
                            : '<p>尚未有課程建議 (請完成 MBTI 測驗)</p>'
                        }
                    </div>

                    <div class="timestamp">
                        此報告由 AI 個人檔案健康檢查系統建立
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
            Alert.alert('通知', '匯出 PDF 功能目前僅支援 Web 環境。');
        }
    };

    if(loading) return <SafeAreaView style={styles.centerFull}><Text style={styles.text}>正在載入...</Text></SafeAreaView>;

    // 登入/註冊畫面
    if(!currentUser){
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerFull}>
                    <Text style={styles.brand}>AI 個人檔案健康檢查</Text>
                    <View style={styles.cardCenter}>
                        <Text style={styles.title}>{isLogin?'登入':'註冊'}</Text>
                        
                        <TextInput 
                            style={styles.input} 
                            placeholder="帳號" 
                            placeholderTextColor="#aaa" 
                            value={form.username} 
                            onChangeText={t=>setForm({...form,username:t})}
                        />
                        
                        <TextInput 
                            style={[
                                styles.input, 
                                passwordError && !isLogin ? styles.inputError : null
                            ]} 
                            placeholder="密碼" 
                            placeholderTextColor="#aaa" 
                            secureTextEntry 
                            value={form.password} 
                            onChangeText={handlePasswordChange}
                        />
                        
                        {passwordError && !isLogin ? (
                            <Text style={styles.errorText}>{passwordError}</Text>
                        ) : (
                            <Text style={styles.passwordHint}>
                                {!isLogin ? '密碼要求: 8-16字元，包含數字、大小寫字母' : ''}
                            </Text>
                        )}

                        {!isLogin && (
                            <>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="姓名" 
                                    placeholderTextColor="#aaa" 
                                    value={form.fullname} 
                                    onChangeText={t=>setForm({...form,fullname:t})}
                                />
                                <Text style={[styles.text,{marginTop:4}]}>系所: 資訊管理</Text>
                                <Text style={[styles.text,{marginBottom:4}]}>年級:</Text>
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
                            <Text style={styles.primaryBtnText}>{isLogin?'登入':'註冊'}</Text>
                        </TouchableOpacity>
                        
                        {/* 顯示登入錯誤訊息 (僅在登入模式) */}
                        {isLogin && loginError ? (
                            <Text style={[styles.errorText, {marginTop: 8}]}>{loginError}</Text>
                        ) : null}
                        
                        <TouchableOpacity 
                            style={{marginTop:12}} 
                            onPress={()=>{
                                setIsLogin(!isLogin); 
                                setForm({username:'',password:'',fullname:'',year:1});
                                setPasswordError('');
                                setLoginError(''); // 切換模式時清除錯誤訊息
                            }}
                        >
                            <Text style={styles.ghostBtnText}>
                                {isLogin?'還沒有帳號？註冊':'已有帳號？登入'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    const courseList = COURSES_BY_DEPT['資訊管理'];
    const mbtiCourses = currentUser.mbti? (COURSES_BY_MBTI[currentUser.mbti.toUpperCase()]||[]) : [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{alignItems:'center',padding:16}}>
                <Text style={styles.welcome}>歡迎，{currentUser.fullname}</Text>
                <TouchableOpacity onPress={handleLogout}><Text style={styles.logout}>登出</Text></TouchableOpacity>
                

                {/* Step 1: 基本資訊 */}
                {step===1 && <View style={styles.section}>
                    <Text style={styles.sectionTitle}>基本資訊</Text>
                    <Text style={styles.text}>姓名: {currentUser.fullname}</Text>
                    <Text style={styles.text}>系所: 資訊管理</Text>
                    <Text style={styles.text}>年級: {currentUser.year} 年級</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(2)}><Text style={styles.primaryBtnText}>下一步 → MBTI</Text></TouchableOpacity>
                </View>}

                {/* Step 2: MBTI 測驗 */}
                {step===2 && <View style={styles.section}>
                    <Text style={styles.sectionTitle}>性格測驗 (MBTI)</Text>
                    
                    {/* 開啟 MBTI 連結按鈕 */}
                    <TouchableOpacity 
                        style={[styles.primaryBtn, {backgroundColor: '#667eea'}]} 
                        onPress={openMBTITest}
                    >
                        <Text style={styles.primaryBtnText}>🌐 開始 MBTI 測驗</Text>
                    </TouchableOpacity>

                    <Text style={[styles.text, {marginVertical: 16}]}>或者</Text>

                    {/* 快速選擇 */}
                    <TouchableOpacity 
                        style={[styles.primaryBtn, {backgroundColor: '#4ecdc4'}]}
                        onPress={() => setShowQuickSelect(!showQuickSelect)}
                    >
                        <Text style={styles.primaryBtnText}>⚡ 快速選擇類型</Text>
                    </TouchableOpacity>

                    {/* 快速選擇 Grid */}
                    {showQuickSelect && (
                        <View style={styles.quickSelectContainer}>
                            <Text style={[styles.text, {marginBottom: 12}]}>選擇 MBTI 類型:</Text>
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

                    {/* MBTI 結果輸入 */}
                    <Text style={[styles.text,{marginTop:16, marginBottom: 8}]}>輸入 MBTI 結果:</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="輸入 4 個字母" 
                        value={mbtiInput}
                        onChangeText={setMbtiInput}
                        autoCapitalize="characters"
                        maxLength={4}
                    />

                    {mbtiInput && (
                        <Text style={[styles.text, {color: '#4ecdc4', marginTop: 8}]}>
                            目前結果: {mbtiInput.toUpperCase()}
                        </Text>
                    )}

                    {/* 導航按鈕 */}
                    <TouchableOpacity 
                        style={[styles.primaryBtn, {backgroundColor:'#ffb347', marginTop: 16}]} 
                        onPress={()=>{
                            if (mbtiInput.length === 4) {
                                saveProgress();
                                setStep(4); 
                            } else {
                                Alert.alert('通知', '請輸入 MBTI 測驗結果');
                            }
                        }}
                    >
                        <Text style={styles.primaryBtnText}>查看結果</Text>
                    </TouchableOpacity>

                    <View style={{flexDirection:'row', justifyContent:'space-between', width:'100%', marginTop:12}}>
                        <TouchableOpacity style={[styles.primaryBtn,{backgroundColor:'#555',flex:1,marginRight:6}]} onPress={()=>setStep(1)}>
                            <Text style={styles.primaryBtnText}>← 上一步</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.primaryBtn,{flex:1,marginLeft:6}]} 
                            onPress={()=>{
                                if (mbtiInput.length === 4) {
                                    saveProgress();
                                    setStep(3);
                                } else {
                                    Alert.alert('通知', '請輸入 MBTI 測驗結果');
                                } 
                            }}>
                            <Text style={styles.primaryBtnText}>下一步 →</Text>
                        </TouchableOpacity>
                    </View>
                </View>}

                {/* Step 3: 選擇課程 */}
                {step===3 && <View style={styles.section}>
                    <Text style={styles.sectionTitle}>選擇課程</Text>
                    {courseList.map(c=><TouchableOpacity key={c} style={[styles.courseBtn, selectedCourses.includes(c)?styles.courseBtnSelected:null]} onPress={()=>toggleCourse(c)}><Text style={selectedCourses.includes(c)?styles.courseBtnTextSelected:styles.courseBtnText}>{c}</Text></TouchableOpacity>)}
                    <View style={{flexDirection:'row', justifyContent:'space-between', width:'100%', marginTop:12}}>
                        <TouchableOpacity style={[styles.primaryBtn,{backgroundColor:'#555',flex:1,marginRight:6}]} onPress={()=>setStep(2)}>
                            <Text style={styles.primaryBtnText}>← 上一步</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.primaryBtn,{flex:1,marginLeft:6}]} onPress={()=>{saveProgress(); setStep(4)}}>
                            <Text style={styles.primaryBtnText}>完成 →</Text>
                        </TouchableOpacity>
                    </View>
                </View>}

                {/* Step 4: 結果 */}
                {step===4 && <View style={styles.section}>
                    <Text style={styles.sectionTitle}>分析結果</Text>

                    {/* 基本資訊 */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoText}><Text style={{fontWeight:'700'}}>姓名:</Text> {currentUser.fullname}</Text>
                        <Text style={styles.infoText}><Text style={{fontWeight:'700'}}>年級:</Text> {currentUser.year} 年級</Text>
                        <Text style={styles.infoText}><Text style={{fontWeight:'700'}}>MBTI:</Text> {currentUser.mbti || '尚未測驗'}</Text>
                    </View>

                    {/* 已選課程 */}
                    <View style={styles.infoCard}>
                        <Text style={[styles.infoText, {fontWeight:'700', marginBottom: 8}]}>已選擇課程:</Text>
                        {selectedCourses.length > 0 ? (
                            selectedCourses.map((course, index) => (
                                <Text key={`sel-${index}`} style={styles.infoText}>• {course}</Text>
                            ))
                        ) : (
                            <Text style={[styles.infoText, {color: '#aaa'}]}>無</Text>
                        )}
                    </View>

                    {/* MBTI 建議課程 */}
                    <View style={styles.infoCard}>
                        <Text style={[styles.infoText, {fontWeight:'700', marginBottom: 8}]}>MBTI 建議課程:</Text>
                        {mbtiCourses.length > 0 ? (
                            mbtiCourses.map((course, index) => (
                                <Text key={`mbti-${index}`} style={styles.infoText}>• {course}</Text>
                            ))
                        ) : (
                            <Text style={[styles.infoText, {color: '#aaa'}]}>無建議 (請完成 MBTI 測驗)</Text>
                        )}
                    </View>

                    {/* 匯出按鈕 */}
                    <TouchableOpacity 
                        style={[styles.primaryBtn, {backgroundColor:'#ff6b6b', marginTop: 20}]} 
                        onPress={handleExportPDF}
                    >
                        <Text style={styles.primaryBtnText}>📄 匯出 PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.primaryBtn,{marginTop:12, backgroundColor:'#555'}]} 
                        onPress={()=>setStep(3)}
                    >
                        <Text style={styles.primaryBtnText}>← 上一步</Text>
                    </TouchableOpacity>
                </View>}

                <View style={{height:40}}/>
            </ScrollView>
        </SafeAreaView>
    )
} 

// Styles (保持英文名稱以利除錯，但值仍適用)
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
        paddingHorizontal: 13,
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
});s