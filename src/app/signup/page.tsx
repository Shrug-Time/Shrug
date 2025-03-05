"use client";

import { Inter } from "next/font/google";
import { useState, useEffect } from "react";
import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../firebase"; // Adjust path
import { createUserWithEmailAndPassword } from "firebase/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) router.push("/");
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Signed up as " + email.split("@")[0]);
      router.push("/"); // Firebase will redirect via useEffect
    } catch (error: any) {
      alert("Signup failed: " + error.message);
    }
  };

  return (
    <div className={`${inter.variable} min-h-screen bg-black text-white flex flex-col`}>
      <header className="p-4">
        <h1 className="text-2xl font-bold">Shrug</h1>
      </header>
      <main className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          <h2 className="text-xl mb-6">Sign Up</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              Sign Up
            </button>
          </form>
          <p className="mt-4 text-center">
            Already have an account?{" "}
            <a href="/login" className="underline">Log In</a>
          </p>
        </div>
      </main>
    </div>
  );
}