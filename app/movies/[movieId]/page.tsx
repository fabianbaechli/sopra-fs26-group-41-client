"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Spin, Typography } from "antd";
import { UserOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { MovieDetails } from "@/types/movie";
import styles from "@/styles/page.module.css";

const { Title, Text, Paragraph } = Typography;

type OverlapState =
  | { status: "loading" }
  | { status: "ready"; value: number }
  | { status: "unavailable" }
  | { status: "error" };

const MoviePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const apiService = useApi();
  const { clear: clearToken } = useLocalStorage<string>("token", "");

  const movieId = useMemo(() => {
    const value = params?.movieId;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overlapState, setOverlapState] = useState<OverlapState>({ status: "loading" });
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    try {
      await apiService.post("/logout");
    } catch {
    } finally {
      clearToken();
      router.replace("/login");
    }
  };

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    router.push(`/search?query=${encodeURIComponent(trimmedQuery)}`);
  };

  useEffect(() => {
    let isMounted = true;

    setMovie(null);
    setMovieLoading(true);
    setError(null);
    setOverlapState({ status: "loading" });

    const fetchMovie = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!movieId) {
        if (isMounted) {
          setError("Movie id is missing.");
          setMovieLoading(false);
          setOverlapState({ status: "unavailable" });
        }
        return;
      }

      try {
        const response = await apiService.get<MovieDetails>(`/movies/${movieId}`);
        if (!isMounted) return;

        setMovie(response);
        setError(null);
        setMovieLoading(false);
      } catch (err) {
        if (!isMounted) return;

        const status = (err as { status?: number }).status;

        if (status === 401 || status === 403) {
          clearToken();
          router.replace("/login");
          return;
        }

        setError("Could not load this movie. Please go back and try again.");
        setMovieLoading(false);
        setOverlapState({ status: "error" });
      }
    };

    const fetchOverlap = async () => {
      const token = localStorage.getItem("token");

      if (!token || !movieId) {
        return;
      }

      try {
        const response = await apiService.get<number | { tasteOverlap?: number | null } | null>(
          `/movies/${movieId}/overlap`
        );
        if (!isMounted) return;

        const value =
          typeof response === "number"
            ? response
            : typeof response === "object" && response !== null && typeof response.tasteOverlap === "number"
              ? response.tasteOverlap
              : null;

        if (typeof value === "number" && !isNaN(value)) {
          setOverlapState({ status: "ready", value });
        } else {
          setOverlapState({ status: "unavailable" });
        }
      } catch {
        if (!isMounted) return;
        setOverlapState({ status: "unavailable" });
      }
    };

    fetchMovie();
    fetchOverlap();

    return () => {
      isMounted = false;
    };
  }, [movieId, apiService, clearToken, router]);

  const genreList =
    movie?.genres
      ?.split(",")
      .map((genre) => genre.trim())
      .filter(Boolean) ?? [];

  const hasPoster =
    movie?.posterUrl && movie.posterUrl !== "N/A" && movie.posterUrl.trim() !== "";

  const movieYear = Number(movie?.year);
  const isOutsideRecommendationDataset = Number.isFinite(movieYear) && movieYear > 2023;

  const renderOverlap = () => {
    if (overlapState.status === "loading") {
      return (
        <div className={styles.section}>
          <div className={styles.tasteMatchBanner}>
            <Spin size="small" />
            <span className={styles.tasteMatchText}>Taste overlap loading…</span>
          </div>
        </div>
      );
    }
    if (overlapState.status === "ready") {
      if (overlapState.value === 0 && isOutsideRecommendationDataset) {
        return (
          <div className={styles.section}>
            <div className={styles.tasteMatchBanner}>
              <span className={styles.tasteMatchText}>
                Taste match is unavailable because our recommendation dataset currently only covers movies up to October 2023.
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className={styles.section}>
          <div className={styles.tasteMatchBanner}>
            <UserOutlined style={{ fontSize: 16, color: "#86fd80" }} />
            <span className={styles.tasteMatchValue}>{overlapState.value}% Match</span>
            <span className={styles.tasteMatchText}>with your Letterboxd taste profile</span>
          </div>
        </div>
      );
    }
    if (overlapState.status === "error" || overlapState.status === "unavailable") {
      return (
        <div className={styles.section}>
          <div className={styles.tasteMatchBanner}>
            <span className={styles.tasteMatchText}>Taste overlap cannot be computed</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const nav = (
    <div className={styles.hero}>
      <div className={styles.heroLeft}>
        <Link href="/users/me" style={{ textDecoration: "none", color: "inherit" }}>
          <div className={styles.brandRow}>
            <img src="/logo.png" alt="logo" className={styles.logo} />
            <Title level={1} className={styles.brand}>
              Movieblendr.
            </Title>
          </div>
        </Link>
        <Title level={3} className={styles.subtitle}>
          Movie Details
        </Title>
      </div>
      <div className={styles.heroRight}>
        <Input.Search
          className={styles.searchInput}
          placeholder="Search movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSearch={handleSearch}
          enterButton
        />
        <Button className={styles.authButton} onClick={() => router.back()}>
          Back
        </Button>
        <Button className={styles.authButton} onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );

  if (movieLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          {nav}
          <Card className={styles.shellCard}>
            <div className={styles.loadingWrap}>
              <Spin size="large" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          {nav}
          <Card className={styles.shellCard}>
            <Text type="danger">{error ?? "Failed to load movie details."}</Text>
            <div className={styles.errorActions}>
              <Button className={styles.authButton} onClick={() => router.back()}>
                Go back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {nav}
        <Card className={styles.shellCard}>
          <div className={styles.movieLayout}>
            <div>
              {hasPoster ? (
                <img
                  src={movie.posterUrl}
                  alt={`${movie.title} poster`}
                  className={styles.moviePoster}
                />
              ) : (
                <div className={styles.posterFallback}>
                  <VideoCameraOutlined style={{ fontSize: 40, color: "#8f6d60" }} />
                </div>
              )}
            </div>

            <div>
              <div className={styles.label}>Title</div>
              <Title level={2} className={styles.movieTitle}>
                {movie.title}
              </Title>

              <div className={styles.movieInfoGrid}>
                <Card className={styles.softCard}>
                  <div className={styles.label}>Year</div>
                  <div className={styles.statValue}>{movie.year ?? "-"}</div>
                </Card>

                <Card className={styles.softCard}>
                  <div className={styles.label}>IMDb Rating</div>
                  <div className={styles.statValue}>{movie.imdbRating || "-"}</div>
                </Card>

                <Card className={styles.softCard}>
                  <div className={styles.label}>Runtime</div>
                  <div className={styles.runtimeValue}>{movie.runtime || "-"}</div>
                </Card>

                <Card className={styles.softCard}>
                  <div className={styles.label}>Director</div>
                  <Text className={styles.directorText}>{movie.director || "-"}</Text>
                </Card>
              </div>

              {renderOverlap()}

              <div className={styles.section}>
                <Title level={3} className={styles.sectionTitle}>
                  Genres
                </Title>
                {genreList.length > 0 ? (
                  <div className={styles.genreWrap}>
                    {genreList.map((genre) => (
                      <span key={genre} className={styles.genrePill}>
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Text className={styles.helperText}>No genres available.</Text>
                )}
              </div>

              <div className={styles.section}>
                <Title level={3} className={styles.sectionTitle}>
                  Description
                </Title>
                <Paragraph className={styles.descriptionText}>
                  {movie.description || "No description available."}
                </Paragraph>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MoviePage;
