"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_LANGUAGES = ["Indonesian", "English"];

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    display_name?: string;
    native_language?: string;
    timezone?: string;
    daily_goal_minutes?: string;
  };
};

type ProfileUpdate = {
  display_name?: string;
  native_language?: string;
  timezone?: string;
  daily_goal_minutes?: number;
};

function validate(formData: FormData) {
  const fieldErrors: NonNullable<ProfileFormState["fieldErrors"]> = {};
  const update: ProfileUpdate = {};

  if (formData.has("display_name")) {
    const raw = String(formData.get("display_name") ?? "").trim();
    if (raw.length < 1 || raw.length > 80) {
      fieldErrors.display_name = "Nama harus 1–80 karakter.";
    } else {
      update.display_name = raw;
    }
  }

  if (formData.has("native_language")) {
    const raw = String(formData.get("native_language") ?? "");
    if (!ALLOWED_LANGUAGES.includes(raw)) {
      fieldErrors.native_language = "Pilihan bahasa tidak valid.";
    } else {
      update.native_language = raw;
    }
  }

  if (formData.has("timezone")) {
    const raw = String(formData.get("timezone") ?? "").trim();
    if (raw.length > 60) {
      fieldErrors.timezone = "Timezone tidak valid.";
    } else if (raw.length > 0) {
      update.timezone = raw;
    }
  }

  if (formData.has("daily_goal_minutes")) {
    const raw = Number(formData.get("daily_goal_minutes"));
    if (!Number.isInteger(raw) || raw < 1 || raw > 600) {
      fieldErrors.daily_goal_minutes = "Target harian harus 1–600 menit.";
    } else {
      update.daily_goal_minutes = raw;
    }
  }

  return { update, fieldErrors };
}

export async function updateProfile(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const { update, fieldErrors } = validate(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Periksa kembali isian Anda.", fieldErrors };
  }
  if (Object.keys(update).length === 0) {
    return { status: "error", message: "Tidak ada perubahan untuk disimpan." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    return { status: "error", message: "Gagal menyimpan perubahan. Coba lagi." };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Perubahan tersimpan." };
}
