"use client"

import Link from "next/link";
import Form from "next/form";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState(null);
  const [file, setFile] = useState<File | null>(null);
  const [labelName, setLabelName] = useState(null);

  function setLabelName

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/parsing", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setResult(data);
  }

  return (
    <div className="flex h-screen w-screen justify-center items-center">
      <div className="flex absolute top-0 items-center justify-between bg-blue-500 w-full h-16 text-white p-5">
        <div className="flex items-center">
          <Link href={"/"} className="font-semibold">Senior Project</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href={"/"}>Dashboard</Link>
          <Link href={"/"}>Chat</Link>
          <Link href={"/"}>Setting</Link>
          <Link href={"/"}>Profile</Link>
        </div>
      </div>
      <div className="w-56 h-40 flex justify-items-center">
        <form onSubmit={handleSubmit} className="flex justify-items-center gap-5">
          <label className="flex items-center justify-center outline outline-1 outline-gray-300 rounded-lg h-12 w-48 cursor-pointer text-sm text-gray-500">
            Choose file here
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden outline-1 rounded-lg h-1/4 w-48" />
          </label>
          <button type="submit" className="bg-blue-500 text-white text-center w-20 h-12 rounded-lg">Submit</button>
          {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
        </form>

      </div>
    </div >
  );
}
