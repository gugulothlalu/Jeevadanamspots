import LocationPicker from "./components/LocationPicker";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";

const categories = [
  { name: "All Services", icon: "🌍" },
  { name: "Food & Annadhanam", icon: "🍲" },
  { name: "Medical Help", icon: "🩺" },
  { name: "Blood Donation", icon: "🩸" },
  { name: "Education", icon: "📚" },
  { name: "Jobs & Skills", icon: "💼" },
  { name: "Shelter & Essentials", icon: "🏠" },
  { name: "Donations & Volunteering", icon: "🤝" },
  { name: "Community Events", icon: "🎉" },
  { name: "Other Help", icon: "💛" },
];



const today = () => new Date().toISOString().slice(0, 10);

const initialForm = {
  title: "",
  category: "Food & Annadhanam",
  area: "",
  address: "",
  latitude: null,
  longitude: null,
  date: today(),
  start: "12:00",
  end: "14:30",
  notes: "",
};

function formatTime(time) {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${hour % 12 || 12}:${String(minute).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function isServiceActive(service) {
  if (!service.date || !service.start || !service.end) {
    return false;
  }

  const now = new Date();

  const start = new Date(
    `${service.date}T${service.start}:00`
  );

  const end = new Date(
    `${service.date}T${service.end}:00`
  );

  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  return now >= start && now <= end;
}

function getServiceStatus(service) {
  if (!service.date || !service.start || !service.end) {
    return "upcoming";
  }

  const now = new Date();

  const start = new Date(
    `${service.date}T${service.start}:00`
  );

  const end = new Date(
    `${service.date}T${service.end}:00`
  );

  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  if (now < start) {
    return "upcoming";
  }

  if (now >= start && now <= end) {
    return "active";
  }

  return "completed";
}

function App() {
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");

  /*
    -------------------------------------------------------
    GLOBAL BROWSER ID
    One browser gets one ID.
    No login required.
    -------------------------------------------------------
  */
  const [clientId] = useState(() => {
    let id = localStorage.getItem("jeevadanam-client-id");

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("jeevadanam-client-id", id);
    }

    return id;
  });

  /*
    -------------------------------------------------------
    GLOBAL REACTIONS FROM SUPABASE
    -------------------------------------------------------
  */
  const [reactions, setReactions] = useState([]);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState("All Services");

  const [filter, setFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [selected, setSelected] = useState(null);

  /*
    -------------------------------------------------------
    LOAD REACTIONS
    -------------------------------------------------------
  */
  async function loadReactions() {
    const { data, error } = await supabase
      .from("service_reactions")
      .select(
        "id, service_id, client_id, reaction_type"
      );

    if (error) {
      console.error(
        "Reaction loading error:",
        error
      );
      return;
    }

    setReactions(data || []);
  }

  /*
    -------------------------------------------------------
    LOAD SERVICES
    -------------------------------------------------------
  */
  async function loadServices() {
    setLoadingServices(true);
    setServicesError("");

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setServicesError(error.message);
      setLoadingServices(false);
      return;
    }

    const mappedServices = (data || []).map(
      (item) => ({
        ...item,

        area: item.area || "",

        start: item.start_time
          ? new Date(item.start_time)
              .toTimeString()
              .slice(0, 5)
          : "",

        end: item.end_time
          ? new Date(item.end_time)
              .toTimeString()
              .slice(0, 5)
          : "",

        date: item.start_time
          ? new Date(item.start_time)
              .toISOString()
              .slice(0, 10)
          : "",

        notes: item.description || "",

        interestedCount:
          item.interested_count || 0,

        reportCount: 0,

        status: "public",
      })
    );

    setServices(mappedServices);
    setLoadingServices(false);
  }

  /*
    -------------------------------------------------------
    INITIAL LOAD
    -------------------------------------------------------
  */
  useEffect(() => {
    loadServices();
    loadReactions();
  }, []);

  /*
    -------------------------------------------------------
    REACTION COUNT
    -------------------------------------------------------
  */
  function getReactionCount(
    serviceId,
    reactionType
  ) {
    return reactions.filter(
      (reaction) =>
        reaction.service_id === serviceId &&
        reaction.reaction_type === reactionType
    ).length;
  }

  /*
    -------------------------------------------------------
    CHECK WHETHER CURRENT BROWSER REACTED
    -------------------------------------------------------
  */
  function hasReacted(
    serviceId,
    reactionType
  ) {
    return reactions.some(
      (reaction) =>
        reaction.service_id === serviceId &&
        reaction.client_id === clientId &&
        reaction.reaction_type === reactionType
    );
  }

  /*
    -------------------------------------------------------
    GLOBAL INTERESTED / REPORT TOGGLE
    -------------------------------------------------------
  */
  async function handleReaction(
    serviceId,
    reactionType
  ) {
    /*
      Sample/demo cards don't exist in Supabase,
      so don't try to insert reactions for them.
    */
    if (String(serviceId).startsWith("demo-")) {
      return;
    }

    const existingReaction =
      reactions.find(
        (reaction) =>
          reaction.service_id === serviceId &&
          reaction.client_id === clientId &&
          reaction.reaction_type ===
            reactionType
      );

    /*
      If already clicked:
      REMOVE reaction
    */
    if (existingReaction) {
      const { error } = await supabase
        .from("service_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (error) {
        console.error(
          "Remove reaction error:",
          error
        );
        return;
      }
    }

    /*
      If not clicked:
      ADD reaction
    */
    else {
      const { error } = await supabase
        .from("service_reactions")
        .insert({
          service_id: serviceId,
          client_id: clientId,
          reaction_type: reactionType,
        });

      if (error) {
        console.error(
          "Add reaction error:",
          error
        );
        return;
      }
    }

    /*
      Refresh global data
    */
    await loadReactions();
  }

  /*
    -------------------------------------------------------
    ALL SERVICES
    -------------------------------------------------------
  */
  const allServices = useMemo(
  () => services,
  [services]
);

  /*
    -------------------------------------------------------
    FILTER SERVICES
    -------------------------------------------------------
  */
  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allServices.filter((service) => {
      /*
        Automatically hide completed services
      */
      const status =
        getServiceStatus(service);

      if (status === "completed") {
        return false;
      }

      const matchesSearch = [
        service.title,
        service.category,
        service.area,
        service.address,
        service.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesCategory =
        activeCategory === "All Services" ||
        service.category === activeCategory;

      const matchesDate =
        filter !== "today" ||
        service.date === today();

      const matchesActive =
        filter !== "active" ||
        isServiceActive(service);

      /*
        Near Me currently keeps the existing
        search/location behavior.
      */
      const matchesNear =
        filter !== "near" || true;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDate &&
        matchesActive &&
        matchesNear
      );
    });
  }, [
    allServices,
    search,
    activeCategory,
    filter,
  ]);

  /*
    -------------------------------------------------------
    RESET SEARCH
    -------------------------------------------------------
  */
  function resetSearch() {
    setSearch("");
    setActiveCategory("All Services");
    setFilter("all");
  }

  /*
    -------------------------------------------------------
    FORM UPDATE
    -------------------------------------------------------
  */
  function updateForm(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /*
    -------------------------------------------------------
    OPEN SHARE FORM
    -------------------------------------------------------
  */
  function openForm() {
    setError("");
    setLocationError("");
    setForm(initialForm);
    setModalOpen(true);
    fetchCurrentLocation();
  }

  /*
    -------------------------------------------------------
    CURRENT LOCATION
    -------------------------------------------------------
  */
  async function fetchCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        "Location is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        try {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
  );

  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  const data = await response.json();

  const fullAddress =
    data.display_name ||
    latitude + ", " + longitude;

  setForm((previous) => ({
    ...previous,
    area: fullAddress,
    address: fullAddress,
    latitude,
    longitude,
  }));
} catch {
  setForm((previous) => ({
    ...previous,
    area:
      latitude.toFixed(5) +
      ", " +
      longitude.toFixed(5),
    address:
      latitude +
      ", " +
      longitude,
    latitude,
    longitude,
  }));

  setLocationError(
    "Full address could not be fetched. Coordinates added instead."
  );
} finally {
  setLocationLoading(false);
}
      },

      (geoError) => {
        setLocationLoading(false);

        if (geoError.code === 1) {
          setLocationError(
            "Location permission denied. Please enter your area manually."
          );
        } else {
          setLocationError(
            "Unable to fetch location. Please enter your area manually."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  /*
    -------------------------------------------------------
    PUBLISH SERVICE
    -------------------------------------------------------
  */
  async function publishService(event) {
    event.preventDefault();
    setError("");

    if (
      !form.title.trim() ||
      !form.area.trim() ||
      !form.address.trim() ||
      !form.date ||
      !form.start ||
      !form.end
    ) {
      setError(
        "Please complete all required fields."
      );
      return;
    }

    if (form.end <= form.start) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    const startDateTime = new Date(
      `${form.date}T${form.start}:00`
    );

    const endDateTime = new Date(
      `${form.date}T${form.end}:00`
    );

    const {
      data,
      error: insertError,
    } = await supabase
      .from("services")
      .insert({
        title: form.title.trim(),
        description: form.notes.trim(),
        category: form.category,
        area: form.area.trim(),
        address: form.address.trim(),
        latitude:
          form.latitude ?? null,
        longitude:
          form.longitude ?? null,
        start_time:
          startDateTime.toISOString(),
        end_time:
          endDateTime.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const newService = {
      ...data,

      area: form.area.trim(),

      date: form.date,

      start: form.start,

      end: form.end,

      notes: form.notes.trim(),

      interestedCount: 0,

      reportCount: 0,

      status: "public",
    };

    setServices((previous) => [
      newService,
      ...previous,
    ]);

    setModalOpen(false);
    setForm(initialForm);
    setSearch("");
    setActiveCategory("All Services");
    setFilter("all");
  }

  /*
    -------------------------------------------------------
    NEAR ME
    -------------------------------------------------------
  */
  function useMyLocation() {
    if (!navigator.geolocation) {
      alert(
        "Location is not supported by this browser."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const query = `${coords.latitude},${coords.longitude}`;

        setSearch(query);
        setFilter("near");
      },

      () => {
        alert(
          "Location permission was not granted."
        );
      }
    );
  }

  /*
    -------------------------------------------------------
    GOOGLE MAPS DIRECTIONS
    -------------------------------------------------------
  */
  function openDirections(
    address,
    latitude,
    longitude
  ) {
    let destination = address || "";

    if (
      latitude !== null &&
      latitude !== undefined &&
      longitude !== null &&
      longitude !== undefined
    ) {
      destination = `${latitude},${longitude}`;
    }

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${encodeURIComponent(
        destination
      )}` +
      `&travelmode=driving`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const selectedService =
    allServices.find(
      (service) =>
        service.id === selected
    );

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            💛
          </div>

          <div>
            <h1 className="brand-title">
  <span className="brand-jeevadanam">Jeevadanam</span><span className="brand-spots">spots</span>
</h1>

            <p>
              Open Community Service • Khammam
            </p>
          </div>
        </div>

        <div className="header-actions">

          {/* Instagram */}
          <a
            href="https://www.instagram.com/jeevadanamspots/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            aria-label="Instagram"
            title="Instagram"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />

              <circle
                cx="12"
                cy="12"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />

              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
              />
            </svg>
          </a>

          {/* Mail */}
          <a
            href="mailto:jeevadanamspots@gmail.com"
            className="social-icon"
            aria-label="Email"
            title="Email"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />

              <path
                d="M3 7l9 7 9-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </a>

          {/* Share */}
          <button
            type="button"
            className="primary-button add-button"
            onClick={openForm}
          >
            <span>＋</span>
            Share a Service
          </button>
        </div>
      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main>

        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">

            <span className="eyebrow">
              KHAMMAM • OPEN TO EVERYONE
            </span>

            <h2>
              Small acts of kindness.
              <br />
              A stronger community.
            </h2>

            <p>
              Find help, share resources and
              discover community services
              across Khammam. Everyone is welcome.
            </p>

            <button
              className="hero-button"
              onClick={openForm}
            >
              ＋ Share a Community Service
            </button>
          </div>

          <div
            className="hero-art"
            aria-hidden="true"
          >
            <span>🤝</span>
            <span>💛</span>
            <span>🌱</span>
          </div>
        </section>


        {/* PRIVACY */}
        <section className="privacy-banner">
          <span className="privacy-icon">
            🔒
          </span>

          <div>
            <strong>
              Open community service. No login required.
            </strong>

            <p>
              No names, phone numbers or email
              addresses are requested. Your location
              is only accessed if you choose Near Me.
            </p>
          </div>
        </section>


        {/* SERVICES */}
        <section className="services-section">

          <div className="section-heading">
            <div>
              <h2>
                Community Services
              </h2>

              <p>
                Discover help and opportunities
                around Khammam.
              </p>
            </div>

            <span className="count-badge">
              {filteredServices.length} results
            </span>
          </div>


          {/* SEARCH */}
          <label className="search-box">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search service, area or landmark..."
              aria-label="Search community services"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>


          {/* FILTERS */}
          <div className="filters">

            <button
              className={
                filter === "all"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All Services ({allServices.length})
            </button>

            <button
              className={
                filter === "today"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("today")
              }
            >
              🟢 Today Only
            </button>

            <button
              className={
                filter === "active"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("active")
              }
            >
              🔥 Active Now (
              {
                allServices.filter(
                  isServiceActive
                ).length
              }
              )
            </button>

            <button
              className={
                filter === "near"
                  ? "filter active"
                  : "filter"
              }
              onClick={useMyLocation}
            >
              📍 Near Me
            </button>

          </div>


          {/* CATEGORIES */}
          <div className="category-grid">

            {categories.map(
              (category) => (
                <button
                  key={category.name}
                  className={
                    activeCategory ===
                    category.name
                      ? "category-card selected"
                      : "category-card"
                  }
                  onClick={() =>
                    setActiveCategory(
                      category.name
                    )
                  }
                >
                  <span className="category-icon">
                    {category.icon}
                  </span>

                  <span>
                    {category.name}
                  </span>
                </button>
              )
            )}

          </div>


          {/* RESULTS HEADING */}
          <div className="results-heading">

            <h3>
              {activeCategory ===
              "All Services"
                ? "All Community Services"
                : activeCategory}
            </h3>

            <span className="live-badge">
              <span />
              Community feed
            </span>

          </div>


          {/* LOADING */}
          {loadingServices && (
            <div className="empty-state">
              <div className="empty-icon">
                ⏳
              </div>

              <h3>
                Loading services...
              </h3>
            </div>
          )}


          {/* ERROR */}
          {!loadingServices &&
            servicesError && (
              <div className="empty-state">
                <div className="empty-icon">
                  ⚠️
                </div>

                <h3>
                  Unable to load services
                </h3>

                <p>
                  {servicesError}
                </p>

                <button
                  className="outline-button"
                  onClick={loadServices}
                >
                  Try Again
                </button>
              </div>
            )}


          {/* SERVICE CARDS */}
          {!loadingServices &&
            !servicesError &&
            filteredServices.length >
              0 && (
              <div className="service-grid">

                {filteredServices.map(
                  (service) => {

                    const interestedCount =
                      getReactionCount(
                        service.id,
                        "interested"
                      );

                    const reportCount =
                      getReactionCount(
                        service.id,
                        "report"
                      );

                    const isInterested =
                      hasReacted(
                        service.id,
                        "interested"
                      );

                    const isReported =
                      hasReacted(
                        service.id,
                        "report"
                      );

                    return (
                      <article
                        className="service-card"
                        key={service.id}
                      >

                        {/* CARD TOP */}
                        <div className="card-top">

                          <span className="service-category">
                            {
                              categories.find(
                                (category) =>
                                  category.name ===
                                  service.category
                              )?.icon ||
                              "💛"
                            }{" "}
                            {service.category}
                          </span>

                          <span className="local-badge">
  Community
</span>

                        </div>


                        {/* TITLE */}
                        <div className="service-title-row">

                          <h3>
                            {service.title}
                          </h3>

                          {getServiceStatus(
                            service
                          ) === "active" && (
                            <span className="active-badge">
                              ● Active Now
                            </span>
                          )}

                          {getServiceStatus(
                            service
                          ) === "upcoming" && (
                            <span className="upcoming-badge">
                              ◷ Upcoming
                            </span>
                          )}

                        </div>


                        {/* NOTES */}
                        <p className="service-notes">
                          {service.notes ||
                            "Community service information."}
                        </p>


                        {/* META */}
                        <div className="service-meta">

  <span className="service-full-address">
    📍 {service.address || service.area}
  </span>

  <span>
    📅 {service.date}
  </span>

  <span>
    🕒{" "}
    {formatTime(service.start)}{" "}
    –{" "}
    {formatTime(service.end)}
  </span>

</div>


                        {/* =================================================
                            GLOBAL INTERESTED
                        ================================================= */}

                        <div className="interest-panel">

                          <button
                            type="button"
                            className={
                              isInterested
                                ? "interested-button interested"
                                : "interested-button"
                            }
                            onClick={() =>
                              handleReaction(
                                service.id,
                                "interested"
                              )
                            }
                          >
                            {isInterested
                              ? "♥ Interested"
                              : "♡ Interested"}

                            {" · "}

                            {interestedCount}
                          </button>

                          <div className="interest-info">

                            <span className="people-icon">
                              👥
                            </span>

                            <span>
                              {interestedCount}{" "}
                              {interestedCount ===
                              1
                                ? "person interested"
                                : "people interested"}
                            </span>

                          </div>

                        </div>


                        {/* =================================================
                            ACTIONS
                        ================================================= */}

                        <div className="card-actions">

                          <button
                            type="button"
                            className="outline-button"
                            onClick={() =>
                              setSelected(
                                service.id
                              )
                            }
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            className="map-button"
                            onClick={() =>
                              openDirections(
                                service.address,
                                service.latitude,
                                service.longitude
                              )
                            }
                          >
                            📍 Directions
                          </button>

                        </div>


                        {/* =================================================
                            GLOBAL REPORT
                        ================================================= */}

                        <div className="report-panel">

                          <button
                            type="button"
                            className="report-button"
                            onClick={() =>
                              handleReaction(
                                service.id,
                                "report"
                              )
                            }
                          >
                            {isReported
                              ? "⚑ Reported"
                              : "⚑ Report"}

                            {" · "}

                            {reportCount}
                          </button>

                          <div className="report-info">
                            <span>
                              Help keep our community safe
                            </span>
                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}


          {/* EMPTY */}
          {!loadingServices &&
            !servicesError &&
            filteredServices.length ===
              0 && (
              <div className="empty-state">

                <div className="empty-icon">
                  ⌕
                </div>

                <h3>
                  No services found
                </h3>

                <p>
                  Try another area,
                  category or search term.
                </p>

                <button
                  className="outline-button"
                  onClick={resetSearch}
                >
                  Reset Search
                </button>

              </div>
            )}

        </section>


        {/* BOTTOM BANNER */}
        <section className="bottom-banner">

          <div>
            <h2>
              Have something to share?
            </h2>

            <p>
              Your community service could
              make someone's day easier.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={openForm}
          >
            ＋ Add a Service
          </button>

        </section>

      </main>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">

        <strong>
          Jeevadanam
        </strong>

        <span>
          Khammam • Open Community Service
        </span>

        <p>
          Kindness has no boundaries.
        </p>

      </footer>


      {/* =====================================================
          SHARE SERVICE MODAL
      ===================================================== */}

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setModalOpen(false);
            }
          }}
        >

          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >

            <div className="modal-heading">

              <div>

                <h2 id="form-title">
                  Share a Community Service
                </h2>

                <p>
                  Help people discover a
                  service in Khammam.
                </p>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setModalOpen(false)
                }
                aria-label="Close form"
              >
                ×
              </button>

            </div>


            <div className="notice">

              <span>ⓘ</span>

              <p>
                No registration or contact
                details required. Please check
                that the service information
                is accurate.
              </p>

            </div>


            <form onSubmit={publishService}>

              {/* SERVICE NAME */}
              <label>
                Service name *

                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="e.g. Free Medical Camp"
                  maxLength={100}
                  required
                />
              </label>


              {/* CATEGORY */}
              <label>
                Service category *

                <select
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                  required
                >
                  {categories
                    .slice(1)
                    .map(
                      (category) => (
                        <option
                          key={
                            category.name
                          }
                          value={
                            category.name
                          }
                        >
                          {category.name}
                        </option>
                      )
                    )}
                </select>
              </label>


              {/* LOCATION PICKER */}
              <label>

                <LocationPicker
                  onLocationSelect={(
                    location
                  ) => {
                    setForm(
                      (previous) => ({
                        ...previous,

                        area:
                          location.area ||
                          previous.area,

                        address:
                          location.address ||
                          previous.address,

                        latitude:
                          location.latitude,

                        longitude:
                          location.longitude,
                      })
                    );
                  }}
                />

                {locationLoading && (
                  <small className="location-status">
                    📍 Fetching your current
                    location...
                  </small>
                )}

                {locationError && (
                  <small className="location-error">
                    {locationError}
                  </small>
                )}

              </label>


              {/* ADDRESS */}
              <label>
                Exact public landmark / address *

                <input
                  name="address"
                  value={form.address}
                  onChange={updateForm}
                  placeholder="e.g. Near the main bus station"
                  maxLength={200}
                  required
                />
              </label>


              {/* DATE */}
              <div className="form-section-title">
                2. DISTRIBUTION DATE & TIME WINDOW{" "}
                <span>*</span>
              </div>


              <div className="date-options">

                {/* TODAY */}
                <button
                  type="button"
                  className={
                    form.date === today()
                      ? "date-option active"
                      : "date-option"
                  }
                  onClick={() =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        date: today(),
                      })
                    )
                  }
                >
                  Today
                </button>


                {/* TOMORROW */}
                <button
                  type="button"
                  className={
                    form.date ===
                    new Date(
                      Date.now() +
                        86400000
                    )
                      .toISOString()
                      .slice(0, 10)
                      ? "date-option active"
                      : "date-option"
                  }
                  onClick={() => {
                    const tomorrow =
                      new Date(
                        Date.now() +
                          86400000
                      )
                        .toISOString()
                        .slice(0, 10);

                    setForm(
                      (previous) => ({
                        ...previous,
                        date: tomorrow,
                      })
                    );
                  }}
                >
                  Tomorrow
                </button>


                {/* CUSTOM DATE */}
                <button
                  type="button"
                  className={
                    form.date !== today() &&
                    form.date !==
                      new Date(
                        Date.now() +
                          86400000
                      )
                        .toISOString()
                        .slice(0, 10)
                      ? "date-option active"
                      : "date-option"
                  }
                  onClick={() => {
                    document
                      .getElementById(
                        "custom-service-date"
                      )
                      ?.showPicker?.();

                    document
                      .getElementById(
                        "custom-service-date"
                      )
                      ?.focus();
                  }}
                >
                  Custom Date
                </button>

              </div>


              <input
                id="custom-service-date"
                type="date"
                name="date"
                value={form.date}
                onChange={updateForm}
                required
                className="custom-date-input"
              />


              {/* TIME */}
              <div className="time-grid">

                <label>
                  Start Time *

                  <input
                    type="time"
                    name="start"
                    value={form.start}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  End Time *

                  <input
                    type="time"
                    name="end"
                    value={form.end}
                    onChange={updateForm}
                    required
                  />
                </label>

              </div>


              {/* NOTES */}
              <label>
                Quick landmark notes / directions

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={updateForm}
                  placeholder="Share useful details for visitors..."
                  rows="3"
                  maxLength={500}
                />
              </label>


              {error && (
                <p className="form-error">
                  {error}
                </p>
              )}


              <div className="privacy-note">
                🔒 Your form does not request
                your name, phone number or
                email address.
              </div>


              <button
                type="submit"
                className="primary-button publish-button"
              >
                ✓ Publish Service
              </button>


              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setModalOpen(false)
                }
              >
                Cancel
              </button>

            </form>

          </section>

        </div>
      )}


      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedService && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelected(null);
            }
          }}
        >

          <section
            className="modal details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
          >

            <div className="modal-heading">

              <div>

                <span className="service-category">
                  {selectedService.category}
                </span>

                <h2 id="details-title">
                  {selectedService.title}
                </h2>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setSelected(null)
                }
                aria-label="Close details"
              >
                ×
              </button>

            </div>


            <div className="details-list">

              <p>
                📍 <strong>Area:</strong>{" "}
                {selectedService.area}
              </p>

              <p>
                🗺️{" "}
                <strong>Landmark:</strong>{" "}
                {selectedService.address}
              </p>

              <p>
                📅 <strong>Date:</strong>{" "}
                {selectedService.date}
              </p>

              <p>
                🕒 <strong>Time:</strong>{" "}
                {formatTime(
                  selectedService.start
                )}{" "}
                –{" "}
                {formatTime(
                  selectedService.end
                )}
              </p>

              <p>
                ℹ️{" "}
                {selectedService.notes ||
                  "No additional notes."}
              </p>

            </div>


            <button
              type="button"
              className="map-button"
              onClick={() =>
                openDirections(
                  selectedService.address,
                  selectedService.latitude,
                  selectedService.longitude
                )
              }
            >
              📍 Directions on Maps
            </button>

          </section>

        </div>
      )}

    </div>
  );
}

export default App;
