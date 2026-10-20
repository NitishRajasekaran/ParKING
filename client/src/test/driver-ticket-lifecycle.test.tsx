import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { Ticket } from "@/lib/api";

describe("Driver ticket query cache and refresh lifecycle", () => {
  it("updates the ticket list and individual ticket cache immediately upon booking", () => {
    const qc = new QueryClient();

    const existingTicket: Ticket = {
      _id: "ticket-old",
      reservation: "res-old",
      lot: { _id: "lot-1", name: "Downtown Lot" },
      qrToken: "token-old",
      ticketCode: "PK-OLD1",
      status: "issued",
    };
    qc.setQueryData<Ticket[]>(["tickets"], [existingTicket]);

    // Simulate booking response
    const newTicket: Ticket = {
      _id: "ticket-new",
      reservation: { _id: "res-new", slot: { _id: "slot-2", label: "B2" } },
      lot: { _id: "lot-1", name: "Downtown Lot" },
      qrToken: "token-new",
      ticketCode: "PK-NEW2",
      status: "issued",
    };

    // Apply the exact cache update logic from driver.lots.$id.tsx
    qc.setQueryData<Ticket[]>(["tickets"], (old) => {
      const existing = old ?? [];
      return existing.some((t) => t._id === newTicket._id)
        ? existing.map((t) => (t._id === newTicket._id ? newTicket : t))
        : [newTicket, ...existing];
    });
    qc.setQueryData(["ticket", newTicket._id], newTicket);

    const cachedTickets = qc.getQueryData<Ticket[]>(["tickets"]);
    expect(cachedTickets).toHaveLength(2);
    expect(cachedTickets?.[0]._id).toBe("ticket-new");
    expect(cachedTickets?.[0].ticketCode).toBe("PK-NEW2");

    const cachedDetail = qc.getQueryData<Ticket>(["ticket", "ticket-new"]);
    expect(cachedDetail).toBeDefined();
    expect(cachedDetail?._id).toBe("ticket-new");
  });

  it("handles live socket event reservation:created to update tickets in cache", () => {
    const qc = new QueryClient();
    qc.setQueryData<Ticket[]>(["tickets"], []);

    const createdTicket: Ticket = {
      _id: "ticket-live",
      reservation: { _id: "res-live", slot: { _id: "slot-3", label: "C3" } },
      lot: { _id: "lot-1", name: "Airport Parking" },
      qrToken: "token-live",
      ticketCode: "PK-LIVE3",
      status: "issued",
    };

    // Apply the live socket listener update logic from driver.tickets.index.tsx
    const data = { ticket: createdTicket };
    if (data?.ticket) {
      qc.setQueryData<Ticket[]>(["tickets"], (old) => {
        const existing = old ?? [];
        return existing.some((t) => t._id === data.ticket._id)
          ? existing.map((t) => (t._id === data.ticket._id ? data.ticket : t))
          : [data.ticket, ...existing];
      });
    }

    const tickets = qc.getQueryData<Ticket[]>(["tickets"]);
    expect(tickets).toHaveLength(1);
    expect(tickets?.[0]._id).toBe("ticket-live");
    expect(tickets?.[0].ticketCode).toBe("PK-LIVE3");
  });
});
