import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/public/presentation/pages/detail_panduan_page.dart';

void main() {
  const additionalGuidance = {
    'Evakuasi Banjir': [
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
    ],
    'Siaga Erupsi Gunung': [
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
    ],
    'Pencegahan Karhutla': [
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
    ],
    'Menghadapi Tsunami': [
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
    ],
    'Waspada Tanah Longsor': [
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
    ],
    'Antisipasi Puting Beliung': [
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
    ],
    'Kesiapsiagaan Kekeringan': [
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
    ],
  };
  const tabNames = ['Prabencana', 'Saat Bencana', 'Pascabencana'];

  for (final entry in additionalGuidance.entries) {
    testWidgets('${entry.key} displays guidance in all three phases', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(home: DetailPanduanPage(title: entry.key)),
      );

      for (var phaseIndex = 0; phaseIndex < tabNames.length; phaseIndex++) {
        if (phaseIndex > 0) {
          await tester.tap(find.text(tabNames[phaseIndex]));
          await tester.pumpAndSettle();
        }

        for (final guidanceItem in entry.value[phaseIndex]) {
          expect(find.text(guidanceItem), findsOneWidget);
        }
      }
    });
  }

  testWidgets('earthquake guide displays guidance for all three phases', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: DetailPanduanPage(title: 'Saat Gempa Terjadi')),
    );

    expect(find.text('Prabencana'), findsOneWidget);
    expect(
      find.text('Siapkan rencana penyelamatan dan latihan merunduk'),
      findsOneWidget,
    );
    expect(find.text('Siapkan alat pemadam kebakaran dan P3K'), findsOneWidget);

    await tester.tap(find.text('Saat Bencana'));
    await tester.pumpAndSettle();
    expect(find.text('Berlindung di bawah meja kuat'), findsOneWidget);
    expect(
      find.text('Jika sedang berkendara, pinggirkan mobil ke bahu jalan'),
      findsOneWidget,
    );

    await tester.tap(find.text('Pascabencana'));
    await tester.pumpAndSettle();
    expect(find.text('Waspada gempa susulan'), findsOneWidget);
    expect(
      find.text('Jika sedang berkendara di luar, tetap di dalam mobil'),
      findsOneWidget,
    );
  });

  testWidgets('earthquake guidance also displays for Gempa Bumi title', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: DetailPanduanPage(title: 'Gempa Bumi')),
    );

    expect(
      find.text('Siapkan rencana penyelamatan dan latihan merunduk'),
      findsOneWidget,
    );
  });
}
