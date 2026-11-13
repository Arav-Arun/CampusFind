import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ImagePlus, X } from "lucide-react";
import Button from "../components/Button";
import api from "../api";

const MAX_BYTES = 10 * 1024 * 1024;
// Vercel rejects request bodies over 4.5 MB, so photos are shrunk before they are sent.
const UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 1600;
const SUGGESTED_TAGS = ["Phone", "Keys", "Wallet", "ID card", "Laptop", "Bottle", "Notebook", "Bag", "Glasses", "Watch"];

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded"));
    };
    img.src = url;
  });

const shrinkImage = async (file) => {
  let img;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob && blob.size < file.size ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
};

const reportedAt = (day) => (day === today() ? new Date() : new Date(`${day}T00:00`)).toISOString();

const Field = ({ label, hint, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
);

const Upload = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [type, setType] = useState(params.get("type") === "found" ? "found" : "lost");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({ description: "", location: "", date: today(), contact_info: "", category: "", color: "", brand: "" });
  const [tags, setTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lost = type === "lost";
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pickFile = (picked) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) return toast.error("That file isn't an image.");
    if (picked.size > MAX_BYTES) return toast.error("Photos must be 10 MB or smaller.");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const onDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const addTag = (tag) => {
    const clean = tag.trim();
    if (clean && !tags.includes(clean) && tags.length < 10) setTags([...tags, clean]);
    setCustomTag("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.warn("Add a photo so others can recognise the item.");

    setSubmitting(true);
    const photo = await shrinkImage(file);
    if (photo.size > UPLOAD_BYTES) {
      setSubmitting(false);
      return toast.error("That photo is too large. Try a smaller one or a screenshot of it.");
    }

    const data = new FormData();
    data.append("image", photo);
    data.append("type", type);
    data.append("description", form.description);
    data.append("location", form.location);
    data.append("date_lost", reportedAt(form.date));
    data.append("contact_info", form.contact_info);
    data.append("category", form.category);
    data.append("color", form.color);
    data.append("brand", form.brand);
    data.append("manual_tags", JSON.stringify(tags));

    try {
      const res = await api.post("/items", data, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Report published.");
      navigate(`/item/${res.data.item.id}`);
    } catch (error) {
      toast.error(
        error.response?.status === 413
          ? "That photo is too large. Try a smaller one."
          : error.response?.data?.error || "The report couldn't be published. Try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-4xl">Report an item</h1>
      <p className="mt-2 text-muted">A clear photo and the place you last saw it are what help most.</p>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">What happened?</legend>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface p-1">
            {[
              { value: "lost", label: "I lost something", active: "bg-lost text-background" },
              { value: "found", label: "I found something", active: "bg-found text-background" },
            ].map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md py-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                  type === option.value ? option.active : "text-muted hover:text-text"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Photo" hint="JPG, PNG or WebP, up to 10 MB. We read the photo to suggest tags.">
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-line">
              <img src={preview} alt="Selected item" className="max-h-80 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute right-2 top-2 rounded-md bg-surface/90 p-1.5 text-text hover:bg-surface"
                aria-label="Remove photo"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label
              className={`flex h-52 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
                dragActive ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-text/30"
              }`}
              onDragEnter={onDrag}
              onDragOver={onDrag}
              onDragLeave={onDrag}
              onDrop={(e) => {
                onDrag(e);
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              <ImagePlus size={28} className="text-muted" />
              <span className="text-sm">
                <span className="font-medium text-accent">Choose a photo</span> or drop it here
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
          )}
        </Field>

        <Field label={lost ? "What did you lose?" : "What did you find?"} htmlFor="description">
          <textarea
            id="description"
            className="h-24 w-full"
            value={form.description}
            onChange={set("description")}
            placeholder="Blue steel bottle with a NASA sticker"
            maxLength={2000}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label={lost ? "Where did you last have it?" : "Where did you find it?"} htmlFor="location">
            <input
              id="location"
              className="w-full"
              value={form.location}
              onChange={set("location")}
              placeholder="Library, 2nd floor"
              maxLength={200}
              required
            />
          </Field>
          <Field label="When" htmlFor="date">
            <input id="date" type="date" className="w-full" value={form.date} max={today()} onChange={set("date")} />
          </Field>
        </div>

        <Field
          label="How to reach you (optional)"
          htmlFor="contact"
          hint="Only shown to someone whose claim you accept."
        >
          <input
            id="contact"
            className="w-full"
            value={form.contact_info}
            onChange={set("contact_info")}
            placeholder="Instagram handle, or the best time to call"
            maxLength={200}
          />
        </Field>

        <Field label="Tags" hint="Tap any that fit. Tags help matching reports find each other.">
          <div className="flex flex-wrap gap-2">
            {[...new Set([...SUGGESTED_TAGS, ...tags])].map((tag) => {
              const selected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => (selected ? setTags(tags.filter((t) => t !== tag)) : addTag(tag))}
                  className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                    selected ? "border-accent bg-accent font-medium text-background" : "border-line bg-surface hover:border-text/40"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 text-sm"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(customTag);
                }
              }}
              placeholder="Your own tag, e.g. gold keychain"
              maxLength={50}
              aria-label="Add your own tag"
            />
            <Button variant="secondary" onClick={() => addTag(customTag)} disabled={!customTag.trim()}>
              Add
            </Button>
          </div>
        </Field>

        <details className="rounded-lg border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">Category, colour and brand</summary>
          <p className="mt-2 text-xs text-muted">Leave these blank and they're filled in from the photo.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input aria-label="Category" placeholder="Category" value={form.category} onChange={set("category")} maxLength={50} />
            <input aria-label="Colour" placeholder="Colour" value={form.color} onChange={set("color")} maxLength={50} />
            <input aria-label="Brand" placeholder="Brand" value={form.brand} onChange={set("brand")} maxLength={50} />
          </div>
        </details>

        <Button type="submit" className="w-full py-3 text-base" disabled={submitting}>
          {submitting ? "Reading the photo and publishing..." : "Publish report"}
        </Button>
      </form>
    </div>
  );
};

export default Upload;
