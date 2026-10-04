import { createFileRoute } from "@tanstack/react-router";
import { FindParking } from "@/components/FindParking";

export const Route = createFileRoute("/driver/")({ component: () => <FindParking /> });
