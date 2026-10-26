import 'package:flutter/material.dart';

class DetailPanduanPage extends StatelessWidget {
  const DetailPanduanPage({required this.title, super.key});

  final String title;

  static const _earthquakeGuidance = [
    [
      'Siapkan rencana penyelamatan dan latihan merunduk',
      'Siapkan alat pemadam kebakaran dan P3K',
      'Bangun konstruksi tahan gempa',
      'Perhatikan aturan wilayah rawan gempa',
    ],
    [
      'Berlindung di bawah meja kuat',
      'Lindungi kepala dengan bantal atau helm',
      'Matikan kompor dan listrik',
      'Gunakan tangga darurat, jangan lift',
      'Jika di luar, jauhi tiang, pohon, dan kaca',
      'Jika sedang berkendara, pinggirkan mobil ke bahu jalan',
    ],
    [
      'Waspada gempa susulan',
      'Segera evakuasi keluar bangunan',
      'Periksa titik api',
      'Berdiri di tempat terbuka jauh dari tebing',
      'Jika sedang berkendara di luar, tetap di dalam mobil',
    ],
  ];

  static const _floodGuidance = [
    [
      'Pahami status peringatan banjir (Siaga I-IV)',
      'Siapkan Tas Siaga Bencana untuk 3 hari',
      'Pindahkan perabot ke tempat tinggi',
      'Simpan dokumen penting di tempat aman',
      'Ketahui cara mematikan listrik dan gas',
    ],
    [
      'Segera evakuasi ke tempat lebih tinggi',
      'Matikan seluruh jaringan listrik',
      'Jangan berjalan di arus air deras; gunakan tongkat untuk cek kepadatan pijakan',
      'Segera tinggalkan mobil jika terjebak air naik',
    ],
    [
      'Hindari air genangan karena risiko kontaminasi kotoran dan setruman listrik',
      'Hati-hati saat memasuki rumah karena potensi kerusakan fondasi',
      'Buang makanan yang terendam banjir',
      'Lakukan Pemberantasan Sarang Nyamuk (PSN)',
    ],
  ];

  static const _volcanoGuidance = [
    [
      'Pantau status gunungapi dari PVMBG',
      'Siapkan masker dan kacamata pelindung debu vulkanik',
      'Ketahui rute evakuasi',
      'Siapkan logistik makanan siap saji',
    ],
    [
      'Jauhi lembah atau aliran sungai',
      'Lindungi diri dari debu vulkanik dengan pakaian tertutup: baju lengan panjang, celana panjang, dan topi',
      'Wajib kenakan masker',
      'Jangan gunakan lensa kontak',
    ],
    [
      'Segera bersihkan atap rumah dari timbunan debu vulkanik agar atap tidak ambruk',
      'Kurangi aktivitas di luar ruangan',
      'Waspadai ancaman banjir lahar dingin di sungai saat hujan turun',
    ],
  ];

  static const _wildfireGuidance = [
    [
      'Jangan membakar rumput atau sampah di area dekat hutan',
      'Pastikan sisa api pembakaran benar-benar mati sebelum ditinggalkan',
      'Hindari aktivitas pembakaran saat cuaca berangin kencang',
    ],
    [
      'Tetaplah di dalam rumah dan tutup semua akses udara agar asap tidak masuk',
      'Nyalakan AC atau penyaring udara jika ada',
      'Perbanyak minum air putih',
      'Selalu gunakan masker N95 jika terpaksa keluar',
    ],
    [
      'Cuci tangan dan wajah setiap kali selesai beraktivitas di luar ruangan',
      'Segera hubungi dokter jika keluarga memiliki riwayat gangguan pernapasan atau jantung akibat paparan asap',
    ],
  ];

  static const _tsunamiGuidance = [
    [
      'Ketahui tanda-tanda tsunami seperti gempa kuat, air laut surut, dan bunyi gemuruh',
      'Segera jauhi pantai dan pahami jalur evakuasi ke tempat tinggi',
    ],
    [
      'Jika mendengar sirine, tinggalkan barang-barang dan berlari ke tempat tinggi',
      'Jika jalan macet, tinggalkan mobil dan evakuasi dengan berjalan kaki',
      'Tetap bertahan di tempat tinggi karena gelombang susulan biasanya lebih besar',
    ],
    [
      'Jauhi area genangan karena rawan aliran listrik dan zat berbahaya',
      'Buang makanan yang terkontaminasi air tsunami',
      'Pastikan cuci tangan menggunakan sabun',
    ],
  ];

  static const _landslideGuidance = [
    [
      'Jangan menggunduli hutan atau tebing',
      'Buat terasering dengan sistem drainase yang baik',
      'Tanami kawasan gersang dengan pohon berakar kuat',
    ],
    [
      'Segera evakuasi dan berlari menjauhi arah suara gemuruh atau arah datangnya material longsor',
    ],
    [
      'Hindari wilayah bekas longsoran karena tanah masih labil',
      'Waspadai potensi longsor susulan jika hujan kembali turun',
    ],
  ];

  static const _windstormGuidance = [
    [
      'Bangun struktur rumah yang kokoh',
      'Perhatikan tanda alam seperti udara panas yang mendadak berubah menjadi awan gelap',
    ],
    [
      'Segera masuk rumah, tutup dan kunci pintu serta jendela',
      'Matikan aliran listrik',
      'Jauhi tiang listrik, papan reklame, dan pohon besar',
    ],
    [
      'Periksa keluarga dan berikan pertolongan pertama jika ada yang cedera',
      'Laporkan kerusakan instalasi listrik atau gas kepada pihak berwenang',
    ],
  ];

  static const _droughtGuidance = [
    [
      'Jaga sumber mata air',
      'Buat tandon atau embung untuk menampung air hujan',
      'Gunakan air dengan bijak',
    ],
    [
      'Atur jadwal penggunaan pasokan air secara ketat',
      'Laporkan kebutuhan air bersih darurat kepada pihak berwenang',
    ],
    [
      'Perbanyak pembuatan sumur resapan atau biopori di sekitar rumah untuk menangkap air saat musim hujan tiba',
    ],
  ];

  static const _emptyGuidance = <List<String>>[[], [], []];

  @override
  Widget build(BuildContext context) {
    final guidance = switch (title) {
      'Saat Gempa Terjadi' || 'Gempa Bumi' => _earthquakeGuidance,
      'Evakuasi Banjir' => _floodGuidance,
      'Siaga Erupsi Gunung' => _volcanoGuidance,
      'Pencegahan Karhutla' => _wildfireGuidance,
      'Menghadapi Tsunami' => _tsunamiGuidance,
      'Waspada Tanah Longsor' => _landslideGuidance,
      'Antisipasi Puting Beliung' => _windstormGuidance,
      'Kesiapsiagaan Kekeringan' => _droughtGuidance,
      _ => _emptyGuidance,
    };
    const phases = ['Prabencana', 'Saat Bencana', 'Pascabencana'];

    return DefaultTabController(
      length: phases.length,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          title: Text(title),
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF172033),
          elevation: 0,
          bottom: const TabBar(
            isScrollable: true,
            labelColor: Color(0xFFB84E00),
            unselectedLabelColor: Colors.blueGrey,
            indicatorColor: Color(0xFFB84E00),
            tabs: [
              Tab(text: 'Prabencana'),
              Tab(text: 'Saat Bencana'),
              Tab(text: 'Pascabencana'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            for (final items in guidance)
              ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) => Card(
                  color: Colors.white,
                  elevation: 0.5,
                  margin: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFFFFF0E4),
                      foregroundColor: const Color(0xFFB84E00),
                      child: Text('${index + 1}'),
                    ),
                    title: Text(
                      items[index],
                      style: const TextStyle(
                        color: Color(0xFF172033),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
