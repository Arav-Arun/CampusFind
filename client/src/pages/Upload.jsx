import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Upload as UploadIcon, X, MapPin, Clock, Type } from "lucide-react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const Upload = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth(); // Get user from context

  useEffect(() => {
    if (!user) {
      // If no user, redirect to login after a brief moment or show message
      // For now, let's just redirect immediately to ensure they login
      navigate("/login");
    }
  }, [user, navigate]);

  // Form State
  const [formData, setFormData] = useState({
    type: "lost",
    description: "",
    location: "",
    time: "",
    contact_info: "",
  });

  // Tag State
  const [tags, setTags] = useState([]);
  const [manualTag, setManualTag] = useState("");

  const PRESET_TAGS = [
    "Electronics",
    "Clothing",
    "Keys",
    "Wallet",
    "ID Card",
    "Phone",
    "Laptop",
    "Water Bottle",
    "Notebook",
    "Bag",
    "Glasses",
    "Watch",
  ];

  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setManualTag("");
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleManualTagSubmit = (e) => {
    e.preventDefault();
    if (manualTag.trim()) {
      addTag(manualTag.trim());
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit clicked. File:", file, "Form:", formData);

    if (!file) {
      alert("Please upload an image for AI analysis.");
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append("image", file);
    data.append("type", formData.type);
    data.append(
      "description",
      formData.description && formData.description.trim() !== ""
        ? formData.description
        : "No description provided"
    );
    data.append(
      "location",
      formData.location && formData.location.trim() !== ""
        ? formData.location
        : "Unknown location"
    );
    // time is optional for now in backend, but good to send
    data.append("contact_info", formData.contact_info || "");
    data.append("category", formData.category || "");
    data.append("color", formData.color || "");
    data.append("brand", formData.brand || "");
    data.append("manual_tags", JSON.stringify(tags));

    try {
      await api.post("/items/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Redirect to home
      navigate("/");
    } catch (error) {
      console.error("Upload failed", error);
      const errMsg =
        error.response?.data?.error || "Upload failed. See console.";
      alert(`Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Report an Item</h1>
        <p className="text-muted mb-8">
          Upload details for AI analysis and matching.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <label className="cursor-pointer">
              <input
                type="radio"
                name="type"
                className="peer sr-only"
                value="lost"
                checked={formData.type === "lost"}
                onChange={handleInputChange}
              />
              <div className="p-4 rounded-xl bg-surface border-2 border-transparent peer-checked:border-red-500/50 peer-checked:bg-red-500/10 transition-all text-center">
                <span className="font-bold block text-lg peer-checked:text-red-400">
                  Lost Item
                </span>
                <span className="text-xs text-muted mt-1">
                  I lost something
                </span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="type"
                className="peer sr-only"
                value="found"
                checked={formData.type === "found"}
                onChange={handleInputChange}
              />
              <div className="p-4 rounded-xl bg-surface border-2 border-transparent peer-checked:border-accent/50 peer-checked:bg-accent/10 transition-all text-center">
                <span className="font-bold block text-lg peer-checked:text-accent">
                  Found Item
                </span>
                <span className="text-xs text-muted mt-1">
                  I found something
                </span>
              </div>
            </label>
          </div>

          {/* Image Upload */}
          <div
            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-colors ${
              dragActive
                ? "border-accent bg-accent/5"
                : "border-surface bg-surface/50"
            } ${preview ? "border-none p-0 overflow-hidden" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {preview ? (
              <div className="relative w-full h-full group">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-4 bg-background rounded-full mb-3 shadow-lg">
                    <UploadIcon className="w-8 h-8 text-accent" />
                  </div>
                  <p className="mb-2 text-sm text-text">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-muted">
                    SVG, PNG, JPG or GIF (MAX. 800x400px)
                  </p>
                </div>
                <input type="file" className="hidden" onChange={handleChange} />
              </label>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="relative">
              <Type className="absolute left-4 top-3.5 text-muted" size={20} />
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={
                  formData.type === "lost"
                    ? "What did you lose? (e.g. Blue Hydroflask)"
                    : "What did you find? (e.g. Blue Hydroflask)"
                }
                className="w-full bg-surface border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-3.5 text-muted z-10"
                  size={20}
                />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder={
                    formData.type === "lost"
                      ? "Where did you lose it?"
                      : "Where did you find it?"
                  }
                  className="w-full bg-surface border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
                  required
                />
              </div>
              <div className="relative">
                <Clock
                  className="absolute left-4 top-3.5 text-muted"
                  size={20}
                />
                <input
                  type="text"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  placeholder={
                    formData.type === "lost"
                      ? "When did you lose it?"
                      : "When did you find it?"
                  }
                  className="w-full bg-surface border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
                />
              </div>

              <input
                type="text"
                name="contact_info"
                value={formData.contact_info || ""}
                onChange={handleInputChange}
                placeholder="Contact Info (Phone, Instagram, etc.) - Optional but recommended"
                className="w-full bg-surface border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
              />

              {/* MANUAL FALLBACK FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <input
                  type="text"
                  name="category"
                  placeholder="Category (e.g. Phone)"
                  value={formData.category || ""}
                  onChange={handleInputChange}
                  className="bg-surface border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-accent outline-none text-sm"
                />
                <input
                  type="text"
                  name="color"
                  placeholder="Color (e.g. Black)"
                  value={formData.color || ""}
                  onChange={handleInputChange}
                  className="bg-surface border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-accent outline-none text-sm"
                />
                <input
                  type="text"
                  name="brand"
                  placeholder="Brand (e.g. Apple)"
                  value={formData.brand || ""}
                  onChange={handleInputChange}
                  className="bg-surface border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-accent outline-none text-sm"
                />
              </div>
            </div>

            <textarea
              placeholder={
                formData.type === "lost"
                  ? "Any other details that might help identify your item..."
                  : "Any other details about the found item..."
              }
              className="w-full bg-surface border-none rounded-xl py-3 px-4 h-32 resize-none focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
            ></textarea>

            {/* Tags Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted">
                Tags & Features
              </label>

              {/* Selected Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted italic">
                    No tags selected
                  </span>
                )}
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESET_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      tags.includes(tag)
                        ? "bg-accent text-black font-medium opacity-50 cursor-default"
                        : "bg-surface border border-white/10 hover:border-accent/50 text-muted hover:text-white"
                    }`}
                    disabled={tags.includes(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualTag}
                  onChange={(e) => setManualTag(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleManualTagSubmit(e)
                  }
                  placeholder="Add custom tag (e.g. 'Gold Keychain')"
                  className="flex-1 bg-surface border-none rounded-xl py-2 px-4 focus:ring-2 focus:ring-accent outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={handleManualTagSubmit}
                  className="px-4 py-2 bg-surface border border-white/10 rounded-xl hover:bg-accent/10 hover:text-accent transition-colors text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full !py-4 text-lg"
            disabled={loading}
          >
            {loading ? "Analyzing & Submitting..." : "Submit Report"}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default Upload;
