"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Spin, Typography, Button, Input } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { MovieSearchDTO, MovieSearchResponse } from "@/types/movie";
import styles from "@/styles/page.module.css";
import Link from "next/link";

const { Title, Text } = Typography;
const { Search } = Input;

const SearchResultsContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query");
  const apiService = useApi();
  const { clear: clearToken } = useLocalStorage("token", "");

  const [movies, setMovies] = useState<MovieSearchDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await apiService.get<MovieSearchResponse>(
          `/movies/search?query=${encodeURIComponent(query)}`
        );


        setMovies(response.results || []);
        setError(null);
      } catch (err) {
        setMovies([]);

        const status =
          (err as { status?: number; response?: { status?: number } })?.status ??
          (err as { response?: { status?: number } })?.response?.status;

        if (status === 401 || status === 403) {
          clearToken();
          router.replace("/login");
          return;
        }

        setError("Something went wrong while searching. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, apiService]);

  const handleMovieClick = (id: string) => {
    router.push(`/movies/${id}`);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingWrap} style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Title level={4} style={{ color: "#fff4eb", marginBottom: "16px", marginTop: "0" }}>
        Showing results for <span style={{ color: "#a52a1f" }}>&quot;{query}&quot;</span>
      </Title>

      {error && (
        <div className={styles.warningBox} style={{ marginBottom: "20px" }}>
          <Text className={styles.warningLabel}>Search Error</Text>
          <br />
          <Text className={styles.warningText}>{error}</Text>
        </div>
      )}

      {!error && movies.length === 0 && query && (
        <Text className={styles.helperText}>No movies found matching that title. Try another search.</Text>
      )}

      {!error && movies.length > 0 && (
        <div className={styles.movieGrid}>
          {movies.map((movie, index) => (
            <Card
              key={`${movie.id}-${index}`}
              className={`${styles.softCard} ${styles.movieCard}`}
              onClick={() => handleMovieClick(movie.id)}
            >
              <div className={styles.moviePosterWrap}>
                {movie.posterUrl && movie.posterUrl !== "N/A" ? (
                  <img
                    src={movie.posterUrl}
                    alt={`${movie.title} poster`}
                    className={styles.moviePoster}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <VideoCameraOutlined style={{ fontSize: 28, color: "#8f6d60" }} />
                  </div>
                )}
              </div>
              <h3 className={styles.movieResultTitle}>{movie.title}</h3>
              <div className={styles.movieResultYear}>{movie.year}</div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

const SearchResultsPage: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    router.push(`/search?query=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <Link href="/users/me" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.brandRow}>
                <img src="/logo.png" alt="logo" className={styles.logo} />
                <Title level={1} className={styles.brand}>
                  Movieblendr.
                </Title>
              </div>
            </Link>
            <Title level={3} className={styles.subtitle}>
              Search Results
            </Title>
          </div>
          <div className={styles.heroRight}>
            <Search
              className={styles.searchInput}
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onSearch={handleSearch}
              enterButton
            />
            <Button className={styles.authButton} onClick={() => router.push("/users/me")}>
              ← Home
            </Button>
          </div>
        </div>

        <Card className={styles.shellCard}>
          <Suspense fallback={
            <div className={styles.loadingWrap} style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
              <Spin size="large" />
            </div>
          }>
            <SearchResultsContent />
          </Suspense>
        </Card>
      </div>
    </div>
  );
};

export default SearchResultsPage;
