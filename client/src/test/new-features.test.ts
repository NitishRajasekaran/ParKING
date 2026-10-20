import { afterEach, describe, expect, it, vi } from "vitest";
import { authApi, ticketsApi, lotsApi, ownerApi, adminApi, http } from "@/lib/api";

describe("New Features API Contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("calls forgotPassword endpoint with email and new password", async () => {
    const postSpy = vi.spyOn(http, "post").mockResolvedValueOnce({
      data: { message: "Password updated successfully." },
    });

    const res = await authApi.forgotPassword("user@example.com", "NewSecret123!");
    expect(postSpy).toHaveBeenCalledWith("/auth/forgot-password", {
      email: "user@example.com",
      password: "NewSecret123!",
    });
    expect(res.message).toBe("Password updated successfully.");
  });

  it("calls delete single ticket and bulk delete used tickets", async () => {
    const deleteSpy = vi.spyOn(http, "delete")
      .mockResolvedValueOnce({ data: { message: "Ticket deleted successfully" } })
      .mockResolvedValueOnce({ data: { message: "Deleted 3 used tickets", deletedCount: 3 } });

    const delOne = await ticketsApi.delete("ticket-123");
    expect(deleteSpy).toHaveBeenNthCalledWith(1, "/tickets/ticket-123");
    expect(delOne.message).toBe("Ticket deleted successfully");

    const delBulk = await ticketsApi.deleteUsed();
    expect(deleteSpy).toHaveBeenNthCalledWith(2, "/tickets/used");
    expect(delBulk.deletedCount).toBe(3);
  });

  it("calls deleteSlot endpoint with lotId and slotId", async () => {
    const deleteSpy = vi.spyOn(http, "delete").mockResolvedValueOnce({
      data: { message: "Slot deleted successfully", slotId: "slot-456" },
    });

    const res = await lotsApi.deleteSlot("lot-789", "slot-456");
    expect(deleteSpy).toHaveBeenCalledWith("/lots/lot-789/slots/slot-456");
    expect(res.slotId).toBe("slot-456");
  });

  it("calls ownerApi deleteGuard endpoint", async () => {
    const deleteSpy = vi.spyOn(http, "delete").mockResolvedValueOnce({
      data: { message: "Guard deleted successfully" },
    });

    const res = await ownerApi.deleteGuard("guard-321");
    expect(deleteSpy).toHaveBeenCalledWith("/owner/guards/guard-321");
    expect(res.message).toBe("Guard deleted successfully");
  });

  it("calls adminApi master controls: deleteStaff, deleteLot, and clearUsedTickets", async () => {
    const deleteSpy = vi.spyOn(http, "delete")
      .mockResolvedValueOnce({ data: { message: "Staff account removed" } })
      .mockResolvedValueOnce({ data: { message: "Parking lot deleted" } })
      .mockResolvedValueOnce({ data: { message: "Used tickets cleared", deletedCount: 5 } });

    const staffRes = await adminApi.deleteStaff("staff-1");
    expect(deleteSpy).toHaveBeenNthCalledWith(1, "/admin/users/staff-1");
    expect(staffRes.message).toBe("Staff account removed");

    const lotRes = await adminApi.deleteLot("lot-2");
    expect(deleteSpy).toHaveBeenNthCalledWith(2, "/admin/lots/lot-2");
    expect(lotRes.message).toBe("Parking lot deleted");

    const clearRes = await adminApi.clearUsedTickets();
    expect(deleteSpy).toHaveBeenNthCalledWith(3, "/tickets/used");
    expect(clearRes.deletedCount).toBe(5);
  });

  it("calls ticketsApi and lotsApi slot cancellation requests", async () => {
    const postSpy = vi.spyOn(http, "post")
      .mockResolvedValueOnce({ data: { message: "Cancellation request submitted" } })
      .mockResolvedValueOnce({ data: { message: "Slot cancellation submitted" } });
    const getSpy = vi.spyOn(http, "get").mockResolvedValueOnce({
      data: { _id: "req-1", status: "pending", type: "slot_cancellation" },
    });

    const ticketRes = await ticketsApi.requestCancellation("ticket-99", "Changed plans");
    expect(postSpy).toHaveBeenNthCalledWith(1, "/tickets/ticket-99/cancel-request", { reason: "Changed plans" });
    expect(ticketRes.message).toBe("Cancellation request submitted");

    const getReq = await ticketsApi.getCancellationRequest("ticket-99");
    expect(getSpy).toHaveBeenCalledWith("/tickets/ticket-99/cancel-request");
    expect(getReq?.status).toBe("pending");

    const slotRes = await lotsApi.requestSlotCancellation("lot-1", "slot-2", "Driver no-show");
    expect(postSpy).toHaveBeenNthCalledWith(2, "/lots/lot-1/slots/slot-2/cancel-request", { reason: "Driver no-show" });
    expect(slotRes.message).toBe("Slot cancellation submitted");
  });

  it("calls adminApi verification requests: get, approve, and reject", async () => {
    const getSpy = vi.spyOn(http, "get").mockResolvedValueOnce({
      data: [{ _id: "req-1", status: "pending", type: "password_reset" }],
    });
    const postSpy = vi.spyOn(http, "post")
      .mockResolvedValueOnce({ data: { message: "Request approved" } })
      .mockResolvedValueOnce({ data: { message: "Request rejected" } });

    const reqs = await adminApi.requests({ status: "pending" });
    expect(getSpy).toHaveBeenCalledWith("/admin/requests", { params: { status: "pending" } });
    expect(reqs).toHaveLength(1);

    const approveRes = await adminApi.approveRequest("req-1");
    expect(postSpy).toHaveBeenNthCalledWith(1, "/admin/requests/req-1/approve");
    expect(approveRes.message).toBe("Request approved");

    const rejectRes = await adminApi.rejectRequest("req-1", "Invalid request");
    expect(postSpy).toHaveBeenNthCalledWith(2, "/admin/requests/req-1/reject", { reason: "Invalid request" });
    expect(rejectRes.message).toBe("Request rejected");
  });
});
