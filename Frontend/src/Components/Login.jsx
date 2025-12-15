import React, { useState, useContext } from "react";
import "../Styles/Login.css";
import logoimg from '../Resources/logo-main.png';
import { useNavigate } from 'react-router-dom';
import { UserContext } from "./Context/UserContext";
import { toast } from "react-toastify";
import API_ENDPOINTS from "../config/apiConfig";

const LoginPage = () => {

    const [isSignup, setIsSignup] = useState(true); 
    const navigate = useNavigate();
    const { fetchUserData } = useContext(UserContext);

    // Input States
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const passwordRegex =/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;


    //  signup 
    const handleSignup = async () => {
    const full_name = firstName + " " + lastName;

    if (!firstName || !lastName || !email || !password) {
        toast.error("All fields are required!");
        return;
    }


    // password validation
    if (!passwordRegex.test(password)) {
        toast.error(
            "Password must include: Min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character"
        );
        return;
    }

    const userData = {
        email: email,
        password: password,
        full_name: full_name
    };

    try {
        const response = await fetch(API_ENDPOINTS.SIGNUP, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        console.log("Signup response:", data);

        if (data.message === "User created successfully") {
            toast.success("Account created successfully!");
            setIsSignup(false);
        } else {
            toast.error(data.message || "Signup failed");
        }

    } catch (error) {
        console.log("Signup error:", error);
        toast.error("Error creating account");
    }
};


    // login
    const handleLogin = async () => {
        const loginData = {
            email: email,
            password: password
        };

        try {
            const response = await fetch(API_ENDPOINTS.LOGIN, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();
            console.log("Login response:", data);

            if (data.status) {

                toast.success("Login successful!");

                localStorage.setItem(
                    "user_basic",
                    JSON.stringify({
                        user_id: data.user_id,
                        full_name: data.full_name,
                        email: loginData.email
                    })
                );

                await fetchUserData(data.user_id);

                navigate("/holder");

            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.log("Login error:", error);
            toast.error("Login failed! Something went wrong.");
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-page-center-container">

                {/*login left sec */}
                <div className="login-page-left-container">
                    <div className="login-page-left-img">
                        <img src={logoimg} className="login-page-left-realimg" alt="Logo" />
                        <h1 className="login-page-left-img-h1">
                            Ignite Your Growth With Guided Intelligence
                        </h1>
                    </div>
                </div>

                {/*login right sec */}
                <div className="login-page-right-container">
                    
                    {/* Logo + Branding */}
                    <div className="right-logo-name-container">
                        <img src={logoimg} className="login-page-right-logo" alt="Logo" />
                        <div className="login-page-right-logoname">EduQuest.Ai</div>
                    </div>

                    {/* login html */}
                    {!isSignup && (
                        <div className="Login-right-Login"> 
                            <div className="Login-right-Heading">Log in</div>
                            
                            <div className="Login-right-Signup-form">

                                <input 
                                    type="email"
                                    className="Login-right-Signup-input-full"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email"
                                />

                                <input 
                                    type="password"
                                    className="Login-right-Signup-input-full"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                />

                                <button 
                                    className="Create-ass-btn"
                                    onClick={() => setIsSignup(true)}
                                >
                                    Create an account
                                </button>

                                <button 
                                    className="Login-right-Signup-button"
                                    onClick={handleLogin}
                                >
                                    Login
                                </button>

                            </div>
                        </div>
                    )}

                    {/* signup html*/}
                    {isSignup && (
                        <div className="Login-right-Signup"> 
                            <div className="Login-right-Heading">Create an account</div>
                            
                            <div className="Login-right-Signup-form">

                                <div className="Login-right-Signup-name-row">
                                    <input
                                        type="text"
                                        className="Login-right-Signup-input-half"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Firstname"
                                    />
                                    <input
                                        type="text"
                                        className="Login-right-Signup-input-half"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Lastname"
                                    />
                                </div>

                                <input 
                                    type="email"
                                    className="Login-right-Signup-input-full"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email"
                                />

                                <input 
                                    type="password"
                                    className="Login-right-Signup-input-full"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                />

                                <div className="Login-right-Signup-terms">
                                    <input type="checkbox" className="Login-right-Signup-checkbox" />
                                    <span className="Login-right-Signup-terms-text">
                                        Terms & Conditions
                                    </span>
                                </div>

                                <button 
                                    className="Create-ass-btn"
                                    onClick={() => setIsSignup(false)}
                                >
                                    Already have an account? Login
                                </button>

                                <button 
                                    className="Login-right-Signup-button"
                                    onClick={handleSignup}>
                                    Create Account
                                </button>

                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default LoginPage;
