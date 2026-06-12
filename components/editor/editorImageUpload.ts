import { supabase } from "@/lib/supabase";

export async function uploadEditorImage(file: File) {
  const cleanName = file.name.replace(/\s+/g, "-");
  const fileName = `${Date.now()}-${cleanName}`;

  const { error } = await supabase.storage
    .from("images")
    .upload(fileName, file);

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(fileName);

  return publicUrl;
}