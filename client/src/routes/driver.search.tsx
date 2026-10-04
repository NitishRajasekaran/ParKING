import { createFileRoute } from "@tanstack/react-router";
import { FindParking } from "@/components/FindParking";

export const Route = createFileRoute("/driver/search")({ component: () => <FindParking focusSearch /> });
