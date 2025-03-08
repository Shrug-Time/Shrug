"use client";

import { Inter } from "next/font/google";
import { useState, useEffect } from "react"; // Add useEffect
import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../firebase"; // Adjust path if needed
import { signInWithEmailAndPassword } from "firebase/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function LoginPage() {
  const [username, setUsername] = useState(""); // Email for Firebase
  const [password, setPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) router.push("/");
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, username, password);
      alert("Logged in as " + username.split("@")[0]); // Strip email domain
      router.push("/"); // Firebase auth will trigger redirect via useEffect
    } catch (error: any) {
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div className={`${inter.variable} min-h-screen bg-black text-white flex flex-col`}>
      <header className="p-4">
        <h1 className="text-2xl font-bold">Shrug</h1>
      </header>
      <main className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          <h2 className="text-xl mb-6">Log In</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="email" // Change to email for Firebase
              placeholder="Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
            />
            <button
              type="submit"
              className="w-full p-2 border border-white rounded hover:bg-white hover:text-black"
            >
              Log In
            </button>
          </form>
          <p className="mt-4 text-center">
            Don’t have an account?{" "}
            <a href="/signup" className="underline">Sign Up</a>
          </p>
        </div>
      </main>
    </div>
  );
}