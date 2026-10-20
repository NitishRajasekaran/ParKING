import type { Ticket } from "./api";

/** Keep the QR bearer token payload exact; fall back for tickets created before ticketCode existed. */
export const ticketQrPayload = (ticket: Pick<Ticket, "qrToken">) => ticket.qrToken;
export const ticketDisplayCode = (ticket: Pick<Ticket, "qrToken" | "ticketCode">) => ticket.ticketCode || ticket.qrToken;
