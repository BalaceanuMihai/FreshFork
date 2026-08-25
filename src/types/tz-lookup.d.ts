/**
 * `tz-lookup` ships no types of its own.
 *
 * It is a single CommonJS function (`module.exports = tzlookup`) that maps a
 * coordinate onto an IANA timezone name using a compressed offline table —
 * roughly 150 KB, no network, no API key, public domain.
 */
declare module "tz-lookup" {
  /**
   * @throws {Error} "invalid coordinates" for non-finite or out-of-range input.
   * @returns An IANA zone name, e.g. "Europe/Bucharest".
   */
  export default function tzlookup(latitude: number, longitude: number): string;
}
