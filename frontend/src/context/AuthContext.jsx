import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

// Create context
const AuthContext = createContext();

// Create provider
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Define logout first so it can be referenced in validateSession
    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user_data");
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        // SUBSCRIPTION-BASED PERSISTENT ACCESS
        // User remains logged in until subscription_end_date is reached
        const validateSession = () => {
            const storedToken = localStorage.getItem("token");
            const storedUserData = localStorage.getItem("user_data");

            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    const now = new Date();
                    const endDate = userData.subscription_end
                        ? new Date(userData.subscription_end)
                        : null;

                    if (endDate && now > endDate) {
                        // Subscription expired — auto-logout
                        logout();
                    } else {
                        // Valid session — restore
                        setUser(userData);
                        setToken(storedToken);
                    }
                } else {
                    // Token exists but no user data — clear to force re-login
                    logout();
                }
            } catch (err) {
                // Session validation failed
                logout();
            } finally {
                setLoading(false);
            }
        };

        validateSession();
    }, [logout]);

    const login = async (phone, txnId, fullName = "", email = "", institution = "", password = "") => {
        setLoading(true);
        try {
            const formData = {
                phone_number: phone,
                txn_id: txnId,
                full_name: fullName,
                email: email,
                institution: institution,
                password: password
            };

            const res = await api.post("/auth/login", formData);
            const { access_token, subscription_end, avatar_url } = res.data;

            if (access_token) {
                localStorage.setItem("token", access_token);
                setToken(access_token);

                const userObj = {
                    phone: phone,
                    full_name: res.data.full_name || fullName,
                    email: res.data.email || email,
                    institution: res.data.institution || institution,
                    avatar_url: avatar_url || null,
                    subscription: "active",
                    subscription_end: subscription_end || null
                };
                setUser(userObj);
                localStorage.setItem("user_data", JSON.stringify(userObj));
                return true;
            }
            return false;
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                "Login failed. Please check your Transaction ID.";
            throw msg;
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
