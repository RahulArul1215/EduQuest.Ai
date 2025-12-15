import { createContext, useState, useEffect } from "react";
import API_ENDPOINTS from "../../config/apiConfig";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);  // full backend data
    const [loading, setLoading] = useState(false);

    // fetch full user data from backend
    const fetchUserData = async (user_id) => {
        setLoading(true);
        try {
            const response = await fetch(API_ENDPOINTS.GET_USER_DATA(user_id));
            const data = await response.json();
            console.log("🔍 FULL USER DATA FROM BACKEND:", data);

            // Save full data in React state
            setUserData(data);
        } catch (error) {
            console.error("❌ Error fetching user data:", error);
        }
        setLoading(false);
    };

    // auto login using localStorage on page refresh
    useEffect(() => {
        const saved = localStorage.getItem("user_basic");

        if (saved) {
            const storedUser = JSON.parse(saved);
            console.log("🔄 Auto-loading user from localStorage:", storedUser);

            // Fetch user full data automatically
            fetchUserData(storedUser.user_id);
        }
    }, []);

    return (
        <UserContext.Provider value={{ userData, setUserData, fetchUserData, loading }}>
            {children}
        </UserContext.Provider>
    );
};
