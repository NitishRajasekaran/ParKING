import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

DIAGRAM_DIR = 'e:/Projects/ParKING/report/diagrams'
os.makedirs(DIAGRAM_DIR, exist_ok=True)

# Common styling helper
def setup_fig(w=10, h=6):
    fig, ax = plt.subplots(figsize=(w, h), dpi=300)
    ax.axis('off')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    return fig, ax

def draw_box(ax, x, y, w, h, text, bg='#F0F4F8', border='#1E3A8A', lw=1.5, fontsize=9, bold=False, text_color='#1E293B'):
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5,rounding_size=1.5",
                                 facecolor=bg, edgecolor=border, linewidth=lw)
    ax.add_patch(box)
    weight = 'bold' if bold else 'normal'
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize,
            fontweight=weight, color=text_color, wrap=True, fontfamily='DejaVu Sans')
    return box

def draw_arrow(ax, x1, y1, x2, y2, text='', color='#334155', lw=1.2, text_offset=(0, 2), fontsize=8):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->", color=color, lw=lw, shrinkA=3, shrinkB=3))
    if text:
        mx = (x1 + x2) / 2 + text_offset[0]
        my = (y1 + y2) / 2 + text_offset[1]
        ax.text(mx, my, text, ha='center', va='center', fontsize=fontsize,
                fontweight='normal', color=color, backgroundcolor='#FFFFFF', fontfamily='DejaVu Sans')

# 1. System Architecture
def gen_fig_3_1():
    fig, ax = setup_fig(11, 7)
    # Background bands
    ax.text(50, 96, "Figure 3.1: ParKING System Architecture", ha='center', fontsize=12, fontweight='bold', color='#0F172A')
    
    # Client Tier
    draw_box(ax, 5, 68, 90, 22, "CLIENT PRESENTATION TIER\nReact 19 | Vite | TanStack Router | Tailwind CSS | Leaflet Maps | Html5-QRCode Scanner",
             bg='#EFF6FF', border='#2563EB', bold=True, fontsize=10)
    draw_box(ax, 7, 70, 20, 12, "Driver Portal\n(Search, Book,\nQR Ticket, History)", bg='#DBEAFE', border='#3B82F6')
    draw_box(ax, 29, 70, 19, 12, "Guard Portal\n(Camera Scan,\nEntry / Exit Verify)", bg='#DBEAFE', border='#3B82F6')
    draw_box(ax, 50, 70, 20, 12, "Owner Portal\n(Lot Config,\nGuards, Revenue)", bg='#DBEAFE', border='#3B82F6')
    draw_box(ax, 72, 70, 21, 12, "Admin Portal\n(All Lots, Users,\nApprovals, Metrics)", bg='#DBEAFE', border='#3B82F6')

    # Communication
    draw_arrow(ax, 25, 68, 25, 52, "HTTPS REST API (JSON / Bearer JWT)", color='#2563EB')
    draw_arrow(ax, 75, 52, 75, 68, "WebSocket (Socket.IO Events)", color='#059669')

    # Application Tier
    draw_box(ax, 5, 30, 90, 22, "APPLICATION BACKEND TIER (Express.js on Node.js)\nShared Port HTTP Server (5000) & Socket.IO Real-Time Dispatcher",
             bg='#F0FDF4', border='#16A34A', bold=True, fontsize=10)
    draw_box(ax, 7, 32, 20, 12, "Security & Auth\n(bcryptjs, JWT,\nRole Guards)", bg='#DCFCE7', border='#22C55E')
    draw_box(ax, 29, 32, 20, 12, "Core Controllers\n(Lots, Reservations,\nTickets, Guard, Admin)", bg='#DCFCE7', border='#22C55E')
    draw_box(ax, 51, 32, 20, 12, "Socket.IO Engine\n(Lot Rooms, Live Slots,\nAvailability Count)", bg='#DCFCE7', border='#22C55E')
    draw_box(ax, 73, 32, 20, 12, "Simulator Gateway\n(Sensor Updates,\nx-simulator-key)", bg='#DCFCE7', border='#22C55E')

    # DB Communication
    draw_arrow(ax, 50, 30, 50, 18, "Mongoose 9.1 ODM (Single Topology, retryWrites=false, Transaction Fallback)", color='#0F172A')

    # Data Tier
    draw_box(ax, 5, 4, 90, 14, "PERSISTENCE TIER — Local MongoDB Standalone Database\nCollections: users, parkinglots (2dsphere index), slots, reservations, tickets, occupancysnapshots",
             bg='#FEF3C7', border='#D97706', bold=True, fontsize=9.5)

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_1_system_architecture.png'))
    plt.close()

# 2. Use Case Diagram
def gen_fig_3_2():
    fig, ax = setup_fig(11, 7.5)
    ax.text(50, 96, "Figure 3.2: ParKING Use Case Diagram", ha='center', fontsize=12, fontweight='bold', color='#0F172A')
    
    # Boundary
    rect = patches.Rectangle((22, 5), 56, 88, linewidth=1.5, edgecolor='#475569', facecolor='#F8FAFC', linestyle='--')
    ax.add_patch(rect)
    ax.text(50, 90, "ParKING System Boundary", ha='center', fontsize=10, fontweight='bold', color='#334155')

    # Use cases
    ucs = [
        (50, 82, "UC-01: Register & Authenticate (JWT)"),
        (50, 73, "UC-02: Search Nearby Lots ($near 2dsphere)"),
        (50, 64, "UC-03: Reserve Slot & Receive QR Ticket"),
        (50, 55, "UC-04: View Real-Time Slot Occupancy"),
        (50, 46, "UC-05: Scan & Validate Ticket QR / Code"),
        (50, 37, "UC-06: Confirm Entry / Exit & Bill Amount"),
        (50, 28, "UC-07: Create Parking Lot & Generate Slots"),
        (50, 19, "UC-08: Manage Guards & Lot Assignments"),
        (50, 10, "UC-09: Platform Admin Approvals & Analytics")
    ]
    for x, y, title in ucs:
        ellipse = patches.Ellipse((x, y), 42, 6.5, edgecolor='#2563EB', facecolor='#EFF6FF', linewidth=1.2)
        ax.add_patch(ellipse)
        ax.text(x, y, title, ha='center', va='center', fontsize=8, fontweight='bold', color='#1E40AF')

    # Actors
    # Driver (left top)
    draw_box(ax, 3, 68, 16, 12, "ACTOR:\nDriver\n(Registered)", bg='#E0E7FF', border='#4338CA', bold=True, fontsize=8.5)
    draw_arrow(ax, 19, 75, 29, 82, color='#4338CA')
    draw_arrow(ax, 19, 74, 29, 73, color='#4338CA')
    draw_arrow(ax, 19, 72, 29, 64, color='#4338CA')
    draw_arrow(ax, 19, 70, 29, 55, color='#4338CA')

    # Guard (left bottom)
    draw_box(ax, 3, 38, 16, 12, "ACTOR:\nSecurity Guard\n(Assigned Lot)", bg='#E0E7FF', border='#4338CA', bold=True, fontsize=8.5)
    draw_arrow(ax, 19, 44, 29, 46, color='#4338CA')
    draw_arrow(ax, 19, 42, 29, 37, color='#4338CA')

    # Owner (right top)
    draw_box(ax, 81, 48, 16, 12, "ACTOR:\nParking Owner\n(Approved)", bg='#FEF3C7', border='#B45309', bold=True, fontsize=8.5)
    draw_arrow(ax, 81, 56, 71, 55, color='#B45309')
    draw_arrow(ax, 81, 54, 71, 28, color='#B45309')
    draw_arrow(ax, 81, 52, 71, 19, color='#B45309')

    # Admin (right bottom)
    draw_box(ax, 81, 15, 16, 12, "ACTOR:\nPlatform Admin\n(Full Control)", bg='#FEE2E2', border='#B91C1C', bold=True, fontsize=8.5)
    draw_arrow(ax, 81, 23, 71, 28, color='#B91C1C')
    draw_arrow(ax, 81, 21, 71, 19, color='#B91C1C')
    draw_arrow(ax, 81, 19, 71, 10, color='#B91C1C')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_2_use_case.png'))
    plt.close()

# 3. Context Diagram
def gen_fig_3_3():
    fig, ax = setup_fig(10, 6)
    ax.text(50, 95, "Figure 3.3: ParKING System Context Diagram (Level 0 DFD)", ha='center', fontsize=12, fontweight='bold', color='#0F172A')

    # System Center
    draw_box(ax, 35, 35, 30, 28, "0.0\nParKING Smart Parking\nManagement System\n\n(Full Automated Workflow,\nREST APIs & WebSockets)",
             bg='#DBEAFE', border='#1E40AF', bold=True, fontsize=9.5)

    # External Entities
    draw_box(ax, 5, 68, 20, 16, "Driver / Commuter\n- GPS Coordinates\n- Reservation request\n- QR presentation", bg='#F1F5F9', border='#475569', bold=True, fontsize=8.5)
    draw_box(ax, 5, 14, 20, 16, "Security Guard\n- QR scan token\n- Entry check\n- Exit confirm", bg='#F1F5F9', border='#475569', bold=True, fontsize=8.5)
    draw_box(ax, 75, 68, 20, 16, "Lot Owner / Admin\n- Lot coordinates & rates\n- Guard staff creation\n- Approvals & analytics", bg='#F1F5F9', border='#475569', bold=True, fontsize=8.5)
    draw_box(ax, 75, 14, 20, 16, "IoT / Hardware Sim\n- Slot ultrasonic/IR\n- Status (avail/occupied)\n- x-simulator-key", bg='#F1F5F9', border='#475569', bold=True, fontsize=8.5)

    # Inflow/outflow arrows
    draw_arrow(ax, 25, 75, 35, 55, "Search & Book Requests", color='#2563EB')
    draw_arrow(ax, 35, 48, 25, 68, "Live Slots & QR Ticket", color='#2563EB')

    draw_arrow(ax, 25, 23, 35, 40, "Scan Ticket QR / Code", color='#4338CA')
    draw_arrow(ax, 35, 36, 25, 18, "Validation & Fee Bill", color='#4338CA')

    draw_arrow(ax, 75, 74, 65, 55, "Lot & Staff Configuration", color='#B45309')
    draw_arrow(ax, 65, 48, 75, 68, "Revenue & Occupancy Metrics", color='#B45309')

    draw_arrow(ax, 75, 23, 65, 40, "Sensor State Updates", color='#059669')
    draw_arrow(ax, 65, 36, 75, 18, "Status Acknowledged", color='#059669')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_3_context_diagram.png'))
    plt.close()

# 4. Level 1 Data Flow Diagram
def gen_fig_3_4():
    fig, ax = setup_fig(11, 7.5)
    ax.text(50, 96, "Figure 3.4: Level 1 Data Flow Diagram (DFD)", ha='center', fontsize=12, fontweight='bold', color='#0F172A')

    # Processes (Circles/rounded boxes)
    p1 = draw_box(ax, 18, 72, 20, 14, "1.0\nAuthenticate &\nAuthorize User", bg='#EFF6FF', border='#2563EB', bold=True, fontsize=8.5)
    p2 = draw_box(ax, 62, 72, 20, 14, "2.0\nManage Lots &\nGenerate Slots", bg='#EFF6FF', border='#2563EB', bold=True, fontsize=8.5)
    p3 = draw_box(ax, 18, 42, 20, 14, "3.0\nGeospatial Search\n& Availability", bg='#EFF6FF', border='#2563EB', bold=True, fontsize=8.5)
    p4 = draw_box(ax, 62, 42, 20, 14, "4.0\nReserve Slot &\nIssue QR Ticket", bg='#EFF6FF', border='#2563EB', bold=True, fontsize=8.5)
    p5 = draw_box(ax, 40, 14, 20, 14, "5.0\nValidate Ticket &\nEntry/Exit Control", bg='#EFF6FF', border='#2563EB', bold=True, fontsize=8.5)

    # Data Stores
    draw_box(ax, 2, 74, 12, 10, "D1: Users\n(bcrypt / roles)", bg='#FEF3C7', border='#B45309', fontsize=7.5)
    draw_box(ax, 86, 74, 12, 10, "D2: Lots & Slots\n(2dsphere)", bg='#FEF3C7', border='#B45309', fontsize=7.5)
    draw_box(ax, 86, 44, 12, 10, "D3: Reservations\n& Tickets", bg='#FEF3C7', border='#B45309', fontsize=7.5)
    draw_box(ax, 2, 16, 14, 10, "D4: Occupancy\nSnapshots", bg='#FEF3C7', border='#B45309', fontsize=7.5)

    # Connections
    draw_arrow(ax, 14, 78, 18, 78, color='#B45309')
    draw_arrow(ax, 38, 78, 62, 78, "Admin/Owner Auth", color='#2563EB')
    draw_arrow(ax, 82, 78, 86, 78, color='#B45309')

    draw_arrow(ax, 86, 74, 38, 50, "Read Lot Coordinates", color='#2563EB')
    draw_arrow(ax, 28, 72, 28, 56, "Driver Credentials", color='#2563EB')

    draw_arrow(ax, 38, 48, 62, 48, "Selected Slot", color='#2563EB')
    draw_arrow(ax, 72, 56, 88, 74, "Update Slot to Reserved", color='#B45309')
    draw_arrow(ax, 82, 48, 86, 48, "Store Ticket & QR", color='#B45309')

    draw_arrow(ax, 88, 44, 60, 24, "Ticket Lookup", color='#2563EB')
    draw_arrow(ax, 40, 22, 16, 22, "Log Occupancy", color='#B45309')
    draw_arrow(ax, 50, 28, 86, 74, "Occupied / Available", color='#2563EB')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_4_level1_dfd.png'))
    plt.close()

# 5. Entity-Relationship / Database Schema Diagram
def gen_fig_3_5():
    fig, ax = setup_fig(11, 7.5)
    ax.text(50, 96, "Figure 3.5: Entity-Relationship & MongoDB Schema Diagram", ha='center', fontsize=12, fontweight='bold', color='#0F172A')

    # Models
    user_txt = "User\n-----\n_id: ObjectId (PK)\nname: String\nemail: String (Unique)\npasswordHash: String\nrole: enum [driver, guard,\n  owner, platform_admin, admin]\nownerStatus: enum\nassignedLots: [ObjectId -> ParkingLot]\nownerId: ObjectId -> User"
    draw_box(ax, 4, 52, 27, 38, user_txt, bg='#F8FAFC', border='#3B82F6', fontsize=7.5)

    lot_txt = "ParkingLot\n----------\n_id: ObjectId (PK)\nname: String\naddress: String\nlocation: GeoJSON Point\n  coordinates: [lng, lat]\n  (2dsphere Index)\ntotalSlots: Number (1-260)\nhourlyRate: Number\ncreatedBy: ObjectId -> User\nowner: ObjectId -> User"
    draw_box(ax, 37, 52, 27, 38, lot_txt, bg='#F8FAFC', border='#3B82F6', fontsize=7.5)

    slot_txt = "Slot\n----\n_id: ObjectId (PK)\nlot: ObjectId -> ParkingLot (FK)\nlabel: String (e.g. A1..A10)\nstatus: enum ['available',\n  'reserved', 'occupied']\nCompound Unique Index:\n  { lot: 1, label: 1 }"
    draw_box(ax, 70, 56, 26, 32, slot_txt, bg='#F8FAFC', border='#3B82F6', fontsize=7.5)

    res_txt = "Reservation\n-----------\n_id: ObjectId (PK)\nuser: ObjectId -> User (FK)\nlot: ObjectId -> ParkingLot (FK)\nslot: ObjectId -> Slot (FK)\nstatus: enum ['reserved',\n  'checked_in', 'completed']"
    draw_box(ax, 4, 8, 27, 34, res_txt, bg='#F8FAFC', border='#3B82F6', fontsize=7.5)

    tick_txt = "Ticket\n------\n_id: ObjectId (PK)\nreservation: ObjectId -> Reservation\nuser: ObjectId -> User\nlot: ObjectId -> ParkingLot\nqrToken: String (Hex, Unique)\nticketCode: String (PK-XXXX, Unique)\nstatus: enum ['issued', 'entered', 'exited']\nenteredAt / exitedAt: Date\namount: Number (fee calculated on exit)"
    draw_box(ax, 37, 6, 30, 38, tick_txt, bg='#F8FAFC', border='#3B82F6', fontsize=7.5)

    occ_txt = "OccupancySnapshot\n-----------------\n_id: ObjectId (PK)\nlot: ObjectId -> ParkingLot\ntimestamp: Date\noccupiedCount: Number\ntotalSlots: Number"
    draw_box(ax, 72, 10, 24, 28, occ_txt, bg='#F8FAFC', border='#3B82F6', fontsize=7.5)

    # Relationships
    draw_arrow(ax, 31, 70, 37, 70, "1 : N (owns)", color='#1E40AF', fontsize=7)
    draw_arrow(ax, 64, 70, 70, 70, "1 : N (contains)", color='#1E40AF', fontsize=7)
    draw_arrow(ax, 17, 52, 17, 42, "1 : N (books)", color='#1E40AF', fontsize=7)
    draw_arrow(ax, 31, 24, 37, 24, "1 : 1 (generates)", color='#1E40AF', fontsize=7)
    draw_arrow(ax, 50, 52, 50, 44, "1 : N (ticket lot)", color='#1E40AF', fontsize=7)
    draw_arrow(ax, 64, 60, 72, 30, "1 : N (snapshots)", color='#1E40AF', fontsize=7)

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_5_database_schema.png'))
    plt.close()

# 6. Component Diagram
def gen_fig_3_6():
    fig, ax = setup_fig(11, 7)
    ax.text(50, 96, "Figure 3.6: ParKING Component Diagram", ha='center', fontsize=12, fontweight='bold', color='#0F172A')

    # Frontend Components
    draw_box(ax, 5, 52, 42, 38, "FRONTEND COMPONENTS (client/src)\n----------------------------------------\n* AppShell & Navigation Layout\n* FindParking (Map & Radius Controls)\n* LotMap (Leaflet Interactive Geo Markers)\n* LotTable (Live Available Count)\n* QrScanner (html5-qrcode Camera Feed)\n* TicketBadge & QR Viewer\n* AuthContext (Token Persistence & State)\n* SocketContext (Live Real-Time Rooms)",
             bg='#EFF6FF', border='#2563EB', bold=False, fontsize=8)

    # Backend Components
    draw_box(ax, 53, 52, 42, 38, "BACKEND CONTROLLERS (server/controllers)\n----------------------------------------\n* authController (JWT, Passwords, First Admin)\n* lotController (GeoJSON, Slot Generation)\n* reservationController (Atomic Slot Concurrency)\n* ticketController (Driver Ticket Lookup)\n* guardController (QR Verification, Entry/Exit)\n* adminController (Metrics, Approvals, Staff)\n* ownerController (Owner Lots, Guards, Revenue)\n* simulatorController (IoT Sensor Status Updates)",
             bg='#F0FDF4', border='#16A34A', bold=False, fontsize=8)

    # Middleware
    draw_box(ax, 5, 14, 42, 28, "MIDDLEWARE & UTILITIES (server/middleware)\n----------------------------------------\n* protect: Bearer JWT validation\n* authorize: Role checks [driver, guard, owner, admin]\n* requireApprovedOwner: Owner verification\n* transaction.js: supportsTransactions() check &\n  graceful standalone fallback logic\n* generateQrToken.js: 32-byte hex entropy",
             bg='#FEF3C7', border='#D97706', bold=False, fontsize=8)

    # Persistence & Communication
    draw_box(ax, 53, 14, 42, 28, "SERVICES & PERSISTENCE (server/services)\n----------------------------------------\n* occupancyService.js (Real-time snapshots)\n* Sockets Engine (Room join/leave, live broadcast)\n* Mongoose Schemas (User, Lot, Slot, Ticket, ...)\n* MongoDB 2dsphere Geospatial Indexing\n* MongoDB Standalone with retryWrites=false",
             bg='#FDF2F8', border='#DB2777', bold=False, fontsize=8)

    # Inter-component arrows
    draw_arrow(ax, 47, 72, 53, 72, "Axios REST & Socket.IO", color='#2563EB')
    draw_arrow(ax, 74, 52, 74, 42, "Routes & Invocation", color='#16A34A')
    draw_arrow(ax, 26, 42, 26, 52, "Auth & Context Feed", color='#D97706')
    draw_arrow(ax, 47, 28, 53, 28, "Session & Models", color='#DB2777')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_6_component_diagram.png'))
    plt.close()

# 7. Sequence Diagram: Authentication
def gen_fig_3_7():
    fig, ax = setup_fig(11, 7)
    ax.text(50, 96, "Figure 3.7: Sequence Diagram — User Authentication & Role Dispatch", ha='center', fontsize=11.5, fontweight='bold', color='#0F172A')

    # Lifelines
    actors = [(15, "User / Browser"), (38, "React AuthContext"), (62, "authController"), (85, "MongoDB (User)")]
    for x, label in actors:
        draw_box(ax, x-10, 85, 20, 7, label, bg='#F1F5F9', border='#334155', bold=True, fontsize=8.5)
        ax.plot([x, x], [12, 85], color='#94A3B8', linestyle='--', lw=1)

    # Sequence steps
    draw_arrow(ax, 15, 78, 38, 78, "1. submit credentials (email, pwd, portal)", color='#2563EB')
    draw_arrow(ax, 38, 70, 62, 70, "2. POST /api/auth/login", color='#2563EB')
    draw_arrow(ax, 62, 62, 85, 62, "3. findOne({ email })", color='#059669')
    draw_arrow(ax, 85, 54, 62, 54, "4. return user document + passwordHash", color='#059669')
    
    # Internal box: bcrypt verify
    draw_box(ax, 54, 44, 16, 6, "bcrypt.compare()\n& signToken(jwt)", bg='#FEF3C7', border='#D97706', fontsize=7)

    draw_arrow(ax, 62, 38, 38, 38, "5. HTTP 200 { token, user }", color='#2563EB')
    
    # Internal box: localStorage save
    draw_box(ax, 30, 28, 16, 6, "localStorage.setItem()\nparking_token, user", bg='#EFF6FF', border='#3B82F6', fontsize=7)

    draw_arrow(ax, 38, 20, 15, 20, "6. Redirect to portal home (/driver, /guard, /owner, /admin)", color='#16A34A')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_7_seq_auth.png'))
    plt.close()

# 8. Sequence Diagram: Lot Creation
def gen_fig_3_8():
    fig, ax = setup_fig(11, 7)
    ax.text(50, 96, "Figure 3.8: Sequence Diagram — Parking Lot Creation & Slot Auto-generation", ha='center', fontsize=11.5, fontweight='bold', color='#0F172A')

    actors = [(12, "Admin / Owner"), (35, "lotController"), (58, "withTransaction"), (80, "MongoDB (Lot/Slot)"), (94, "Socket.IO")]
    for x, label in actors:
        draw_box(ax, x-8, 85, 16, 7, label, bg='#F1F5F9', border='#334155', bold=True, fontsize=8)
        ax.plot([x, x], [12, 85], color='#94A3B8', linestyle='--', lw=1)

    draw_arrow(ax, 12, 78, 35, 78, "1. POST /api/lots (name, coords, totalSlots, rate)", color='#2563EB')
    draw_arrow(ax, 35, 70, 58, 70, "2. execute withTransaction(workFn)", color='#2563EB')
    
    # supportsTransactions check
    draw_box(ax, 50, 60, 16, 6, "supportsTransactions()\nReplicaSet? No -> session=null", bg='#FEF3C7', border='#D97706', fontsize=7)

    draw_arrow(ax, 58, 52, 80, 52, "3. ParkingLot.create([lotData])", color='#059669')
    draw_arrow(ax, 80, 46, 58, 46, "4. createdLot document", color='#059669')

    draw_box(ax, 50, 36, 16, 6, "generateSlotLabels()\n[A1..A10, B1..B10...]", bg='#DCFCE7', border='#22C55E', fontsize=7)

    draw_arrow(ax, 58, 28, 80, 28, "5. Slot.insertMany(slotDocs)", color='#059669')
    draw_arrow(ax, 35, 20, 94, 20, "6. emit('lot:created', lot)", color='#7C3AED')
    draw_arrow(ax, 35, 14, 12, 14, "7. HTTP 201 Created { lot }", color='#16A34A')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_8_seq_lot_creation.png'))
    plt.close()

# 9. Sequence Diagram: Slot Reservation
def gen_fig_3_9():
    fig, ax = setup_fig(11, 7)
    ax.text(50, 96, "Figure 3.9: Sequence Diagram — Slot Reservation & Concurrency Conflict Protection", ha='center', fontsize=11.5, fontweight='bold', color='#0F172A')

    actors = [(12, "Driver App"), (36, "reservationController"), (62, "MongoDB (Slot / Ticket)"), (88, "Socket.IO (Lot Room)")]
    for x, label in actors:
        draw_box(ax, x-9, 85, 18, 7, label, bg='#F1F5F9', border='#334155', bold=True, fontsize=8.5)
        ax.plot([x, x], [12, 85], color='#94A3B8', linestyle='--', lw=1)

    draw_arrow(ax, 12, 78, 36, 78, "1. POST /api/reservations { slotId, lotId }", color='#2563EB')
    draw_arrow(ax, 36, 70, 62, 70, "2. Slot.findOneAndUpdate({ _id, status: 'available' }, { status: 'reserved' })", color='#059669')
    
    # Conflict branch
    draw_arrow(ax, 62, 60, 36, 60, "3a. returns null (already reserved by concurrent driver)", color='#DC2626')
    draw_arrow(ax, 36, 52, 12, 52, "3b. HTTP 409 Conflict ('Slot is no longer available')", color='#DC2626')

    # Success branch
    draw_arrow(ax, 62, 42, 36, 42, "4. returns updated slot (Atomic lock acquired)", color='#16A34A')
    draw_arrow(ax, 36, 34, 62, 34, "5. Create Reservation & Ticket (qrToken, ticketCode)", color='#059669')
    draw_arrow(ax, 36, 26, 88, 26, "6. emit('slot:updated', slot) & emit('lot:availability')", color='#7C3AED')
    draw_arrow(ax, 36, 18, 12, 18, "7. HTTP 201 Created { reservation, ticket }", color='#16A34A')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_9_seq_reservation.png'))
    plt.close()

# 10. Sequence Diagram: Ticket Validation
def gen_fig_3_10():
    fig, ax = setup_fig(11, 7.5)
    ax.text(50, 96, "Figure 3.10: Sequence Diagram — Guard Ticket Validation & Entry/Exit Control", ha='center', fontsize=11.5, fontweight='bold', color='#0F172A')

    actors = [(12, "Guard App"), (38, "guardController"), (65, "MongoDB (Ticket/Slot)"), (90, "Socket.IO & Occupancy")]
    for x, label in actors:
        draw_box(ax, x-9, 85, 18, 7, label, bg='#F1F5F9', border='#334155', bold=True, fontsize=8.5)
        ax.plot([x, x], [10, 85], color='#94A3B8', linestyle='--', lw=1)

    draw_arrow(ax, 12, 78, 38, 78, "1. POST /api/guard/validate { qrToken / ticketCode }", color='#2563EB')
    draw_arrow(ax, 38, 72, 65, 72, "2. Ticket.findOne($or: [{ qrToken }, { ticketCode }])", color='#059669')
    draw_arrow(ax, 65, 66, 38, 66, "3. ticket details (lot, user, slot)", color='#059669')
    draw_arrow(ax, 38, 60, 12, 60, "4. guardCanAccessLot() verified -> return ticket details", color='#16A34A')

    # Entry
    draw_arrow(ax, 12, 50, 38, 50, "5. Tap 'ALLOW ENTRY' -> POST /api/guard/entry", color='#2563EB')
    draw_arrow(ax, 38, 44, 65, 44, "6. ticket.status='entered', slot.status='occupied'", color='#059669')
    draw_arrow(ax, 38, 38, 90, 38, "7. emit('ticket:entry') & createOccupancySnapshot()", color='#7C3AED')
    draw_arrow(ax, 38, 32, 12, 32, "8. HTTP 200 Vehicle Entered Confirmation", color='#16A34A')

    # Exit
    draw_arrow(ax, 12, 22, 38, 22, "9. Tap 'ALLOW EXIT' -> POST /api/guard/exit", color='#2563EB')
    draw_arrow(ax, 38, 16, 65, 16, "10. calculate duration * rate, ticket='exited', slot='available'", color='#059669')
    draw_arrow(ax, 38, 10, 12, 10, "11. HTTP 200 Final Bill Calculated", color='#16A34A')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_10_seq_ticket_validation.png'))
    plt.close()

# 11. Flowchart of End-to-End Workflow
def gen_fig_3_11():
    fig, ax = setup_fig(10, 7.5)
    ax.text(50, 96, "Figure 3.11: Flowchart of End-to-End Smart Parking Workflow", ha='center', fontsize=12, fontweight='bold', color='#0F172A')

    steps = [
        (50, 88, "Driver opens ParKING app and provides GPS coordinates"),
        (50, 77, "System performs $near 2dsphere search (5 km radius) & shows available spots"),
        (50, 66, "Driver selects parking lot, views real-time slot layout, and chooses a slot"),
        (50, 55, "Atomic lock on slot via findOneAndUpdate; Reservation & QR Ticket generated"),
        (50, 44, "Driver arrives at lot gate and presents digital QR / display code to guard"),
        (50, 33, "Guard validates ticket: ALLOW ENTRY transitions slot to 'occupied'"),
        (50, 22, "Parking session active; time tracked until vehicle departure"),
        (50, 11, "Guard scans on departure: ALLOW EXIT computes total fee & frees slot to 'available'")
    ]
    for i, (x, y, text) in enumerate(steps):
        bg = '#EFF6FF' if i % 2 == 0 else '#F0FDF4'
        border = '#2563EB' if i % 2 == 0 else '#16A34A'
        draw_box(ax, 10, y-4, 80, 8, f"{i+1}. {text}", bg=bg, border=border, fontsize=8.5)
        if i < len(steps) - 1:
            draw_arrow(ax, 50, y-4, 50, steps[i+1][1]+4, color='#334155')

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_11_flowchart_parking_workflow.png'))
    plt.close()

# 12. Flowchart of Geospatial Nearby Search
def gen_fig_3_12():
    fig, ax = setup_fig(10, 7)
    ax.text(50, 96, "Figure 3.12: Flowchart of Geospatial Nearby Parking Search", ha='center', fontsize=12, fontweight='bold', color='#0F172A')

    draw_box(ax, 30, 84, 40, 8, "Driver requests nearby lots\n(Latitude & Longitude params)", bg='#EFF6FF', border='#2563EB', bold=True)
    draw_arrow(ax, 50, 84, 50, 74)

    draw_box(ax, 25, 66, 50, 8, "Validate lat (-90..90) and lng (-180..180)\nReturns HTTP 400 if missing or invalid", bg='#FEF3C7', border='#D97706')
    draw_arrow(ax, 50, 66, 50, 56)

    draw_box(ax, 20, 46, 60, 10, "Execute MongoDB $near query with 2dsphere index:\ncoordinates: [lng, lat], $maxDistance: 5000 (meters)", bg='#DCFCE7', border='#16A34A', bold=True)
    draw_arrow(ax, 50, 46, 50, 36)

    draw_box(ax, 20, 26, 60, 10, "For each matched lot:\nSlot.countDocuments({ lot: id, status: 'available' })\nAttach live availableCount", bg='#EFF6FF', border='#2563EB')
    draw_arrow(ax, 50, 26, 50, 16)

    draw_box(ax, 25, 6, 50, 10, "Return JSON array of ranked lots with distance\nand live availability to frontend map & list", bg='#F3E8FF', border='#7C3AED', bold=True)

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_12_flowchart_geospatial.png'))
    plt.close()

# 13. Flowchart of Simulator & Live Updates
def gen_fig_3_13():
    fig, ax = setup_fig(10, 7)
    ax.text(50, 96, "Figure 3.13: Flowchart of Real-Time Occupancy & Simulator Integration", ha='center', fontsize=11.5, fontweight='bold', color='#0F172A')

    draw_box(ax, 25, 84, 50, 8, "IoT Sensor / Simulator sends event\nPOST /api/simulator/slot-state", bg='#EFF6FF', border='#2563EB', bold=True)
    draw_arrow(ax, 50, 84, 50, 74)

    draw_box(ax, 25, 66, 50, 8, "Verify Header x-simulator-key === SIMULATOR_KEY\nStatus allowed: 'available' or 'occupied'", bg='#FEF3C7', border='#D97706')
    draw_arrow(ax, 50, 66, 50, 56)

    draw_box(ax, 15, 46, 70, 10, "Business Integrity Check:\nCannot modify slot if status === 'reserved'\nCannot set 'available' if active ticket status === 'entered'", bg='#FEE2E2', border='#DC2626')
    draw_arrow(ax, 50, 46, 50, 36)

    draw_box(ax, 20, 26, 60, 10, "Atomic Slot update via findOneAndUpdate\nSave snapshot via createOccupancySnapshot(lotId)", bg='#DCFCE7', border='#16A34A', bold=True)
    draw_arrow(ax, 50, 26, 50, 16)

    draw_box(ax, 20, 6, 60, 10, "Socket.IO Broadcast to lot room: `lot:${lotId}`\nemit('slot:updated', slot) & emit('lot:availability')", bg='#F3E8FF', border='#7C3AED', bold=True)

    plt.tight_layout()
    plt.savefig(os.path.join(DIAGRAM_DIR, 'fig3_13_flowchart_simulator.png'))
    plt.close()

if __name__ == '__main__':
    print("Generating diagrams...")
    gen_fig_3_1()
    gen_fig_3_2()
    gen_fig_3_3()
    gen_fig_3_4()
    gen_fig_3_5()
    gen_fig_3_6()
    gen_fig_3_7()
    gen_fig_3_8()
    gen_fig_3_9()
    gen_fig_3_10()
    gen_fig_3_11()
    gen_fig_3_12()
    gen_fig_3_13()
    print("All 13 technical diagrams successfully generated!")
