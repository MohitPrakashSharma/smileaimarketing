import { getDataForSeoAuthHeader } from "./env.server";

export interface DataForSeoMapResult {
  task_id: string;
  cost: number;
  status_code: number;
  items: Array<{
    title: string;
    domain?: string;
    website?: string;
    address?: string;
    phone?: string;
    rating?: number;
    reviews_count?: number;
    rank_group?: number;
    place_id?: string;
  }>;
}

export async function searchDataForSeoMaps(params: {
  keyword: string;
  city: string;
  limit?: number;
}): Promise<DataForSeoMapResult> {
  const authHeader = getDataForSeoAuthHeader(); // Base64 generated at runtime
  const baseUrl = process.env.DATAFORSEO_BASE_URL || "https://api.dataforseo.com";
  const url = `${baseUrl}/v3/serp/google/maps/live/advanced`;

  const payload = [
    {
      keyword: `${params.keyword} in ${params.city}`,
      location_name: `${params.city},United States`,
      language_code: "en",
      depth: Math.min(params.limit || 5, 10),
    },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO HTTP Error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const json = await response.json();
  if (json.status_code !== 20000 && json.status_code !== 200) {
    throw new Error(`DataForSEO Error [${json.status_code}]: ${json.status_message}`);
  }

  const task = json.tasks?.[0];
  const cost = task?.cost || 0;
  const taskId = task?.id || "unknown_task";
  const items = (task?.result?.[0]?.items || []).map((item: Record<string, unknown>) => ({
    title: String(item.title || "Dental Practice"),
    domain: String(item.domain || ""),
    website: String(item.url || item.website || (item.domain ? `https://${item.domain}` : "")),
    address: String(item.address || params.city),
    phone: typeof item.phone === "string" ? item.phone : undefined,
    rating: typeof item.rating === "object" && item.rating ? (item.rating as Record<string, number>).value : typeof item.rating === "number" ? item.rating : 4.5,
    reviews_count: typeof item.reviews_count === "number" ? item.reviews_count : typeof item.rating === "object" && item.rating ? (item.rating as Record<string, number>).votes_count : 25,
    rank_group: typeof item.rank_group === "number" ? item.rank_group : 1,
    place_id: typeof item.place_id === "string" ? item.place_id : undefined,
  }));

  return {
    task_id: taskId,
    cost,
    status_code: json.status_code,
    items,
  };
}
