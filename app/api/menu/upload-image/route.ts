import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import {
  getMenuImageExtension,
  isAllowedMenuImageType,
  MAX_MENU_IMAGE_FILE_BYTES,
  MENU_IMAGES_BUCKET,
} from "@/lib/menu-images";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Görsel dosyası bulunamadı." }, { status: 400 });
  }
  if (!isAllowedMenuImageType(file.type)) {
    return NextResponse.json(
      { error: "Yalnızca JPG, PNG veya WebP görseller yüklenebilir." },
      { status: 400 },
    );
  }
  if (file.size > MAX_MENU_IMAGE_FILE_BYTES) {
    return NextResponse.json(
      { error: `Görsel çok büyük (en fazla ${Math.round(MAX_MENU_IMAGE_FILE_BYTES / 1024)} KB).` },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: "İşletme kaydı bulunamadı." }, { status: 400 });
  }

  const service = createServiceSupabaseClient();
  const ext = getMenuImageExtension(file.type);
  const folder = kind === "cover" ? "covers" : kind === "logo" ? "logos" : "products";
  const objectPath = `${tenant.id}/${folder}/${randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await service.storage
    .from(MENU_IMAGES_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = service.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(objectPath);

  return NextResponse.json({ imageUrl: publicUrl, path: objectPath });
}
