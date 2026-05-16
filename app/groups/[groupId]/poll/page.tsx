"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Spin } from "antd";
import { CheckOutlined, CloseOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { ApiService } from "@/api/apiService";
import styles from "@/styles/page.module.css";

type PollMovie = {
  movieId: string;
  title: string;
  description?: string;
  director?: string;
  genres?: string[];
  runtime?: number;
  imdbRating?: number;
  posterUrl?: string;
  tasteOverlap?: number;
};

type PollResponse = {
  groupId: number;
  status: "NULL" | "OPEN" | "FINISHED" | string;
  pollCompletedByUser: boolean;
  movies: PollMovie[];
};

export default function PollPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poll, setPoll] = useState<PollResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [overlaps, setOverlaps] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!groupId) return;

    let isMounted = true;

    const fetchPoll = async () => {
      try {
        setLoading(true);
        const api = new ApiService();
        const data = await api.get<PollResponse>(`/groups/${groupId}/poll`);
        if (isMounted) {
          setPoll(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const status = (err as { status?: number }).status;
        if (status === 401) {
          router.replace("/login");
          return;
        }
        if (status === 404) {
          setError("No active poll exists for this group.");
        } else {
          setError("Could not load the poll. Please try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPoll();
    return () => { isMounted = false; };
  }, [groupId, router]);

  useEffect(() => {
    if (!poll || !poll.movies || poll.movies.length === 0) return;

    let isMounted = true;

    const uniqueMovies = poll.movies
      .filter((movie) => movie.movieId != null)
      .filter((movie, index, array) => array.findIndex((other) => other.movieId === movie.movieId) === index);

    const fetchOverlapsForAllMovies = async () => {
      const api = new ApiService();

      for (const movie of uniqueMovies) {
        try {
          const response = await api.get<number | { tasteOverlap?: number | null } | null>(
            `/movies/${movie.movieId}/overlap`
          );

          if (!isMounted) return;

          let overlapValue: number | null = null;

          if (typeof response === "number") {
            overlapValue = response;
          } else if (
            typeof response === "object" &&
            response !== null &&
            typeof response.tasteOverlap === "number"
          ) {
            overlapValue = response.tasteOverlap;
          }

          if (typeof overlapValue === "number" && !isNaN(overlapValue)) {
            setOverlaps((previous) => ({ ...previous, [movie.movieId]: overlapValue as number }));
          }
        } catch {
          // ignore, some taste overlaps may not compute, so we just skip it here
        }
      }
    };

    fetchOverlapsForAllMovies();
    return () => { isMounted = false; };
  }, [poll]);

  const backToGroup = `/groups/${groupId}`;

  const nav = (
    <div className={styles.hero}>
      <div className={styles.heroLeft}>
        <Link href="/users/me" style={{ textDecoration: "none", color: "inherit" }}>
          <div className={styles.brandRow}>
            <img src="/logo.png" alt="logo" className={styles.logo} />
            <h1 className={styles.brand}>Movieblendr.</h1>
          </div>
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !poll) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          {nav}
          <div className={`${styles.shellCard} ${styles.pollStateCard}`}>
            <p className={styles.sectionTitle}>{error ?? "Poll not found."}</p>
            <Button className={styles.authButton} onClick={() => router.push(backToGroup)}>
              Back to group
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (poll.status === "NULL" || !poll.movies || poll.movies.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          {nav}
          <div className={`${styles.shellCard} ${styles.pollStateCard}`}>
            <p className={styles.sectionTitle}>No active poll</p>
            <p className={styles.helperText}>There is no active poll for this group right now.</p>
            <Button className={styles.authButton} onClick={() => router.push(backToGroup)}>
              Back to group
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (poll.status === "FINISHED") {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          {nav}
          <div className={`${styles.shellCard} ${styles.pollStateCard}`}>
            <p className={styles.sectionTitle}>Poll finished</p>
            <p className={styles.helperText}>This poll has ended. Check the group page for results.</p>
            <Button className={styles.authButton} onClick={() => router.push(backToGroup)}>
              Back to group
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (poll.pollCompletedByUser) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          {nav}
          <div className={`${styles.shellCard} ${styles.pollStateCard}`}>
            <p className={styles.sectionTitle}>Already voted</p>
            <p className={styles.helperText}>You have already completed this poll.</p>
            <Button className={styles.authButton} onClick={() => router.push(backToGroup)}>
              Back to group
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const movies = poll.movies
    .filter((m) => m.movieId != null)
    .filter((m, idx, arr) => arr.findIndex((x) => x.movieId === m.movieId) === idx);
  const movie = movies[currentIndex];
  const totalMovies = movies.length;
  const votedCount = Object.keys(votes).length;

  const validMovies = movies;
  const allAnswered = validMovies.every((m) => votes[m.movieId] !== undefined);

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;

    const payload = {
      votes: validMovies.map((m) => ({ movieId: m.movieId, interested: votes[m.movieId] })),
    };

    try {
      setSubmitting(true);
      setSubmitError(null);
      const api = new ApiService();
      await api.post(`/groups/${groupId}/vote`, payload);
      router.push(backToGroup);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        const info = (err as { info?: string }).info;
        let reason: string | null = null;
        if (info) {
          try {
            const parsed = JSON.parse(info) as { reason?: string };
            reason = parsed.reason ?? null;
          } catch { }
        }
        setSubmitError(reason ?? "The poll is closed or you have already submitted your answers.");
      } else {
        setSubmitError("Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = (movieId: string, interested: boolean) => {
    const updatedVotes = { ...votes, [movieId]: interested };
    setVotes(updatedVotes);
    if (currentIndex < totalMovies - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowReview(true);
    }
  };

  if (showReview) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          {nav}
          <div className={`${styles.shellCard} ${styles.pollReviewCard}`}>
            <h2 className={styles.sectionTitle}>Your votes</h2>
            <p className={styles.helperText} style={{ marginBottom: 24 }}>
              Review your choices. You can edit any answer before submitting.
            </p>

            <div className={styles.pollReviewList}>
              {movies.map((m) => {
                const vote = votes[m.movieId];
                return (
                  <div key={m.movieId} className={`${styles.softCard} ${styles.pollReviewItem}`}>
                    <div className={styles.pollReviewItemLeft}>
                      {m.posterUrl ? (
                        <>
                          <img
                            src={m.posterUrl}
                            alt={m.title}
                            className={styles.pollReviewPoster}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                            }}
                          />
                          <div style={{ display: "none", width: 44, minWidth: 44, aspectRatio: "2/3", borderRadius: 6, alignItems: "center", justifyContent: "center", background: "rgba(255,244,235,0.06)" }}>
                            <VideoCameraOutlined style={{ fontSize: 20, color: "#8f6d60" }} />
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", width: 44, minWidth: 44, aspectRatio: "2/3", borderRadius: 6, alignItems: "center", justifyContent: "center", background: "rgba(255,244,235,0.06)" }}>
                          <VideoCameraOutlined style={{ fontSize: 20, color: "#8f6d60" }} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p className={styles.groupRecommendationTitle}>{m.title}</p>
                        {m.director && (
                          <p className={styles.helperText} style={{ fontSize: 13 }}>{m.director}</p>
                        )}
                      </div>
                    </div>
                    <div className={styles.pollReviewItemRight}>
                      <button
                        className={`${styles.pollReviewToggleNo} ${vote === false ? styles.pollReviewToggleActive : styles.pollReviewToggleDim}`}
                        onClick={() => setVotes((previous) => ({ ...previous, [m.movieId]: false }))}
                      >
                        <CloseOutlined />
                      </button>
                      <button
                        className={`${styles.pollReviewToggleYes} ${vote === true ? styles.pollReviewToggleActive : styles.pollReviewToggleDim}`}
                        onClick={() => setVotes((previous) => ({ ...previous, [m.movieId]: true }))}
                      >
                        <CheckOutlined />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.pollSubmitArea}>
              {submitError && (
                <p className={styles.warningText} style={{ textAlign: "center", marginBottom: 12 }}>
                  {submitError}
                </p>
              )}
              <Button
                className={styles.authButton}
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                loading={submitting}
              >
                Submit votes
              </Button>
              {!allAnswered && (
                <p className={styles.helperText} style={{ textAlign: "center", fontSize: 13 }}>
                  Answer all movies to enable submission.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        {nav}
        <div className={`${styles.shellCard} ${styles.pollCard}`}>
          <div className={styles.pollProgress}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={styles.label}>Movie {currentIndex + 1} of {totalMovies}</span>
              {votedCount > 0 && (
                <span className={styles.helperText} style={{ fontSize: 13 }}>
                  {votedCount} answered
                </span>
              )}
            </div>
            <div className={styles.pollProgressBar}>
              <div
                className={styles.pollProgressFill}
                style={{ width: `${(votedCount / totalMovies) * 100}%` }}
              />
            </div>
          </div>

          <div className={styles.pollMovieLayout}>
            {movie.posterUrl ? (
              <>
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className={styles.pollPoster}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                  }}
                />
                <div className={styles.pollPosterFallback} style={{ display: "none" }}>
                  <VideoCameraOutlined style={{ fontSize: 28, color: "#8f6d60" }} />
                </div>
              </>
            ) : (
              <div className={styles.pollPosterFallback}>
                <VideoCameraOutlined style={{ fontSize: 28, color: "#8f6d60" }} />
              </div>
            )}

            <div className={styles.pollMovieDetails}>
              <h2 className={`${styles.username} ${styles.pollMovieTitle}`}>{movie.title}</h2>

              <div className={styles.pollMetaRow}>
                {movie.director && (
                  <span className={styles.helperText}>Dir. {movie.director}</span>
                )}
                {movie.runtime && (
                  <span className={styles.helperText}>{movie.runtime} min</span>
                )}
                {movie.imdbRating !== undefined && (
                  <span className={styles.helperText}>⭐ {movie.imdbRating}</span>
                )}
                <span className={styles.helperText}>
                  {overlaps[movie.movieId] !== undefined
                    ? `${overlaps[movie.movieId]}% match`
                    : movie.tasteOverlap !== undefined
                      ? `${movie.tasteOverlap}% match`
                      : "Taste Match N/A"}
                </span>
              </div>

              {Array.isArray(movie.genres) && movie.genres.length > 0 && (
                <div className={styles.genreWrap}>
                  {movie.genres.map((g) => (
                    <span key={g} className={styles.genrePill}>{g}</span>
                  ))}
                </div>
              )}

              {movie.description && (
                <p className={`${styles.helperText} ${styles.pollDescription}`}>
                  {movie.description}
                </p>
              )}

              {votes[movie.movieId] !== undefined && (
                <div className={styles.pollCurrentVote}>
                  <span className={styles.label}>Your answer:</span>
                  <span className={votes[movie.movieId] ? styles.pollVoteBadgeYes : styles.pollVoteBadgeNo}>
                    {votes[movie.movieId] ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.pollActions}>
            <Button
              className={styles.authButton}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              disabled={currentIndex === 0}
            >
              ← Back
            </Button>

            <div className={styles.pollVoteButtons}>
              <Button
                className={styles.pollNoButton}
                onClick={() => handleVote(movie.movieId, false)}
                icon={<CloseOutlined />}
              >
                No
              </Button>
              <Button
                className={styles.pollYesButton}
                onClick={() => handleVote(movie.movieId, true)}
                icon={<CheckOutlined />}
              >
                Yes
              </Button>
            </div>

            <Button
              className={styles.authButton}
              onClick={() => {
                if (currentIndex < totalMovies - 1) {
                  setCurrentIndex((prev) => prev + 1);
                } else {
                  setShowReview(true);
                }
              }}
              disabled={votes[movie.movieId] === undefined}
            >
              {currentIndex < totalMovies - 1 ? "Next →" : "Review →"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
