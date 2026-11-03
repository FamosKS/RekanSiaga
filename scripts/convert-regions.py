"""Convert an official Indonesian administrative dataset to the app's NDJSON contract.

Supports CSV, JSON, and XLSX without third-party packages. It never downloads,
connects to Supabase, or invents missing records.
"""
import argparse
import csv
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ALIASES = {
    "code": {"code", "kode", "kodewilayah", "kodewilayahadministrasi", "kodeprovinsi", "kodekabupatenkota", "kodedesa"},
    "name": {"name", "nama", "namawilayah", "namaprovinsi", "namakabupatenkota", "namadesa"},
    "region_type": {"regiontype", "type", "level", "tingkat", "jen wilayah", "jeniswilayah", "jenis"},
    "parent_code": {"parentcode", "kodeinduk", "kodeparent", "kodekabupaten", "kodekecamatan", "kodeprovinsiinduk"},
}
TYPE_VALUES = {
    "provinsi": "province", "province": "province",
    "kabupaten": "regency", "kab": "regency", "kabupatenkota": "regency", "regency": "regency",
    "kota": "city", "city": "city",
    "kecamatan": "district", "kec": "district", "district": "district",
    "desa": "village", "kelurahan": "village", "kelurahandesa": "village", "village": "village",
}


def key(value):
    return re.sub(r"[^a-z0-9]", "", str(value).strip().lower())


def load_xlsx(path):
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "p": "http://schemas.openxmlformats.org/package/2006/relationships"}
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", ns):
                shared.append("".join(node.text or "" for node in item.iter("{%s}t" % ns["m"])))
        sheet = "xl/worksheets/sheet1.xml"
        root = ElementTree.fromstring(archive.read(sheet))
        rows = []
        for row in root.findall(".//m:row", ns):
            values = {}
            for cell in row.findall("m:c", ns):
                ref = cell.attrib.get("r", "")
                column = re.sub(r"\d", "", ref)
                value = cell.find("m:v", ns)
                text = "" if value is None else value.text or ""
                if cell.attrib.get("t") == "s" and text:
                    text = shared[int(text)]
                elif cell.attrib.get("t") == "inlineStr":
                    text = "".join(node.text or "" for node in cell.findall(".//m:t", ns))
                values[column] = text
            rows.append(values)
        if not rows:
            return []
        columns = sorted({column for row in rows for column in row}, key=lambda item: (len(item), item))
        headers = {column: rows[0].get(column, "").strip() or column for column in columns}
        return [{headers[column]: row.get(column, "") for column in columns} for row in rows[1:]]


def load_rows(path):
    suffix = path.suffix.lower()
    if suffix == ".xlsx":
        return load_xlsx(path)
    text = path.read_text(encoding="utf-8-sig")
    if suffix == ".csv":
        return list(csv.DictReader(text.splitlines()))
    document = json.loads(text)
    if isinstance(document, list):
        return document
    for candidate in ("data", "rows", "results", "items"):
        if isinstance(document.get(candidate), list):
            return document[candidate]
    raise ValueError("JSON must be an array or contain data/rows/results/items")


def column_map(row):
    mapped = {}
    for raw in row:
        normalized = key(raw)
        for target, aliases in ALIASES.items():
            if normalized in aliases and target not in mapped:
                mapped[target] = raw
    return mapped


def normalize_type(value, name=""):
    normalized = key(value)
    if normalized == "kabupatenkota":
        return "city" if str(name).strip().lower().startswith("kota ") else "regency"
    if normalized in TYPE_VALUES:
        return TYPE_VALUES[normalized]
    raise ValueError(f"unsupported region type: {value!r}")


def convert(rows):
    if not rows:
        raise ValueError("input dataset is empty")
    first_map = column_map(rows[0])
    missing = [field for field in ("code", "name", "region_type") if field not in first_map]
    if missing:
        raise ValueError("missing columns: " + ", ".join(missing) + "; use --help for expected aliases")
    result = []
    for number, row in enumerate(rows, 1):
        mapping = column_map(row)
        try:
            code = str(row[mapping["code"]]).strip()
            name = str(row[mapping["name"]]).strip()
            region_type = normalize_type(row[mapping["region_type"]], name)
            parent = str(row[mapping["parent_code"]]).strip() if "parent_code" in mapping and row[mapping["parent_code"]] else ""
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError(f"row {number}: {error}") from error
        if not code or not name:
            raise ValueError(f"row {number}: code and name are required")
        item = {"code": code, "name": name, "region_type": region_type}
        if parent:
            item["parent_code"] = parent
        result.append(item)
    return result


def main():
    parser = argparse.ArgumentParser(description="Convert official region CSV/JSON/XLSX to NDJSON")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(f"input dataset not found: {args.input}")
    try:
        converted = convert(load_rows(args.input))
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(f"Conversion failed: {error}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as output:
        for row in converted:
            output.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(json.dumps({"input": str(args.input), "output": str(args.output), "rows": len(converted)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
