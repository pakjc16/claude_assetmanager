import React, { useState } from 'react';
import { Search, MapPin, X, AlertCircle } from 'lucide-react';
import { JibunAddress } from '../types';
import { AppSettings } from '../App';

// 다음 우편번호 서비스 타입 정의
declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeResult) => void;
        onclose?: () => void;
        width?: string | number;
        height?: string | number;
      }) => { open: () => void; embed: (element: HTMLElement) => void };
    };
  }
}

interface DaumPostcodeResult {
  zonecode: string;
  address: string;
  addressEnglish: string;
  addressType: string;
  userSelectedType: string;
  roadAddress: string;
  roadAddressEnglish: string;
  jibunAddress: string;
  jibunAddressEnglish: string;
  sido: string;
  sidoEnglish: string;
  sigungu: string;
  sigunguEnglish: string;
  sigunguCode: string;
  bname: string;
  bnameEnglish: string;
  bname1: string;
  bname2: string;
  roadname: string;
  roadnameEnglish: string;
  buildingCode: string;
  buildingName: string;
  apartment: string;
  autoRoadAddress: string;
  autoJibunAddress: string;
  query: string;
}

interface AddressSearchResult {
  jibunAddress: JibunAddress;
  roadAddress: string;
  zonecode?: string;
  fullJibunAddress: string;
  pnu?: string;  // VWorld PNU 코드
}

interface AddressSearchProps {
  onAddressSelect: (address: AddressSearchResult) => void;
  placeholder?: string;
  appSettings: AppSettings;
}

// VWorld 지번주소 문자열 파싱
// 예: "부산광역시 강서구 명지동 3317-3" → { sido, sigungu, eupMyeonDong, li, bonbun, bubun }
const parseVWorldTitle = (title: string, bun?: string, ji?: string): JibunAddress => {
  const parts = title.split(' ').filter(p => p.trim());

  let sido = '';
  let sigungu = '';
  let eupMyeonDong = '';
  let li = '';
  let bonbun = '';
  let bubun = '';

  // 첫 번째: 시/도
  if (parts.length >= 1) {
    sido = parts[0];
  }

  // 시/군/구와 읍/면/동 찾기
  const sigunguParts: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // 숫자로 시작하면 번지
    if (/^\d/.test(part)) {
      if (part.includes('-')) {
        const [b, j] = part.split('-');
        bonbun = b;
        bubun = j;
      } else {
        bonbun = part;
      }
      continue;
    }

    // 읍/면/동/가로 끝나면 eupMyeonDong
    if (part.endsWith('읍') || part.endsWith('면') || part.endsWith('동') || part.endsWith('가')) {
      eupMyeonDong = part;
      continue;
    }

    // 리로 끝나면 li
    if (part.endsWith('리')) {
      li = part;
      continue;
    }

    // 그 외는 시/군/구의 일부
    sigunguParts.push(part);
  }

  sigungu = sigunguParts.join(' ');

  // VWorld ID에서 파싱된 본번/부번이 있으면 우선 사용
  if (bun) {
    bonbun = String(Number(bun)); // 앞의 0 제거
  }
  if (ji) {
    bubun = String(Number(ji));
  }

  return { sido, sigungu, eupMyeonDong, li, bonbun, bubun };
};

// 도로명 주소에서 시/도, 시/군/구 추출
// 예: "서울특별시 강남구 삼성로 518 (삼성동)" → { sido: "서울특별시", sigungu: "강남구" }
const parseSidoSigunguFromRoad = (roadAddress: string): { sido: string; sigungu: string } => {
  const parts = roadAddress.split(' ').filter(p => p.trim());
  let sido = '';
  let sigungu = '';

  if (parts.length >= 1) {
    sido = parts[0];
  }

  // 시/군/구 찾기 (구, 군, 시로 끝나는 부분)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.endsWith('구') || part.endsWith('군') || part.endsWith('시')) {
      sigungu = sigungu ? `${sigungu} ${part}` : part;
    } else {
      // 시/군/구가 아닌 부분이 나오면 중단 (도로명 시작)
      break;
    }
  }

  return { sido, sigungu };
};

// 축약형 지번주소 파싱 (시/도, 시/군/구 없이 읍면동+번지만 있는 경우)
// 예: "삼성동 157" → { eupMyeonDong: "삼성동", bonbun: "157", bubun: "" }
const parseAbbreviatedParcel = (parcel: string): { eupMyeonDong: string; li: string; bonbun: string; bubun: string } => {
  const parts = parcel.split(' ').filter(p => p.trim());
  let eupMyeonDong = '';
  let li = '';
  let bonbun = '';
  let bubun = '';

  for (const part of parts) {
    // 숫자로 시작하면 번지
    if (/^\d/.test(part)) {
      if (part.includes('-')) {
        const [b, j] = part.split('-');
        bonbun = b;
        bubun = j;
      } else {
        bonbun = part;
      }
      continue;
    }

    // 읍/면/동/가로 끝나면 eupMyeonDong
    if (part.endsWith('읍') || part.endsWith('면') || part.endsWith('동') || part.endsWith('가')) {
      eupMyeonDong = part;
      continue;
    }

    // 리로 끝나면 li
    if (part.endsWith('리')) {
      li = part;
      continue;
    }
  }

  return { eupMyeonDong, li, bonbun, bubun };
};

// 다음 API용 지번 주소 파싱
const parseJibunAddress = (jibunAddress: string, sido: string, sigungu: string, bname: string): JibunAddress => {
  const parts = jibunAddress.split(' ');
  const lastPart = parts[parts.length - 1];

  let bonbun = '';
  let bubun = '';

  if (lastPart.includes('-')) {
    const [bon, bu] = lastPart.split('-');
    bonbun = bon;
    bubun = bu;
  } else if (/^\d+$/.test(lastPart)) {
    bonbun = lastPart;
  }

  let eupMyeonDong = bname;
  let li = '';

  if (bname.endsWith('리') && bname.length > 1) {
    li = bname;
    eupMyeonDong = '';
  }

  return {
    sido,
    sigungu,
    eupMyeonDong,
    li,
    bonbun,
    bubun
  };
};

export const AddressSearch: React.FC<AddressSearchProps> = ({ onAddressSelect, placeholder = '주소 검색', appSettings }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVWorldModalOpen, setIsVWorldModalOpen] = useState(false);
  const [vworldQuery, setVworldQuery] = useState('');
  const [vworldResults, setVworldResults] = useState<any[]>([]);
  const [vworldError, setVworldError] = useState('');
  const [vworldResultType, setVworldResultType] = useState<'parcel' | 'road' | 'place' | ''>('');

  // 다음 우편번호 스크립트 로드
  const loadDaumPostcodeScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.daum && window.daum.Postcode) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('다음 우편번호 스크립트 로드 실패'));
      document.head.appendChild(script);
    });
  };

  // 다음 우편번호 검색
  const openDaumPostcode = async () => {
    setIsLoading(true);
    try {
      await loadDaumPostcodeScript();

      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeResult) => {
          const jibunAddress = parseJibunAddress(
            data.jibunAddress || data.autoJibunAddress,
            data.sido,
            data.sigungu,
            data.bname
          );

          onAddressSelect({
            jibunAddress,
            roadAddress: data.roadAddress || data.autoRoadAddress,
            zonecode: data.zonecode,
            fullJibunAddress: data.jibunAddress || data.autoJibunAddress
          });
        }
      }).open();
    } catch (error) {
      console.error('주소 검색 오류:', error);
      alert('주소 검색 서비스를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // VWorld API 검색 (지번 → 도로명 → 장소명 순서)
  const searchVWorld = async () => {
    if (!vworldQuery.trim()) return;
    if (!appSettings.vworldApiKey) {
      setVworldError('VWorld API 키가 설정되지 않았습니다. 환경설정에서 API 키를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setVworldError('');
    setVworldResults([]);
    setVworldResultType('');

    const baseUrl = `/api/vworld/req/search?service=search&request=search&version=2.0&size=10&page=1&format=json&key=${appSettings.vworldApiKey}&query=${encodeURIComponent(vworldQuery)}`;

    try {
      // 1. 지번 주소 검색
      const parcelRes = await fetch(`${baseUrl}&type=address&category=parcel`);
      const parcelData = await parcelRes.json();
      console.log('[VWorld] parcel 응답:', parcelData);
      let parcelItems = parcelData.response?.result?.items || [];

      if (parcelItems.length > 0) {
        // ID에서 코드값 파싱
        parcelItems = parcelItems.map((item: any) => {
          const id = item.id || '';
          const sigunguCd = id.substring(0, 5);
          const bjdongCd = id.substring(5, 10);
          const platGbCd = id.length > 10 ? String(Number(id[10]) - 1) : '';
          const bun = id.substring(11, 15);
          let ji = id.substring(15, 19);
          if (ji === '0000') ji = '';
          return { ...item, sigunguCd, bjdongCd, platGbCd, bun, ji };
        });
        setVworldResults(parcelItems);
        setVworldResultType('parcel');
        setIsLoading(false);
        return;
      }

      // 2. 도로명 주소 검색
      const roadRes = await fetch(`${baseUrl}&type=address&category=road`);
      const roadData = await roadRes.json();
      console.log('[VWorld] road 응답:', roadData);
      const roadItems = roadData.response?.result?.items || [];

      if (roadItems.length > 0) {
        setVworldResults(roadItems);
        setVworldResultType('road');
        setIsLoading(false);
        return;
      }

      // 3. 장소명 검색
      const placeRes = await fetch(`${baseUrl}&type=place`);
      const placeData = await placeRes.json();
      console.log('[VWorld] place 응답:', placeData);
      const placeItems = placeData.response?.result?.items || [];

      if (placeItems.length > 0) {
        setVworldResults(placeItems);
        setVworldResultType('place');
        setIsLoading(false);
        return;
      }

      setVworldError('검색 결과가 없습니다.');
    } catch (error) {
      console.error('VWorld 검색 오류:', error);
      setVworldError('API 호출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // VWorld 결과 선택
  const handleVWorldSelect = (item: any) => {
    let jibunAddress: JibunAddress;
    let roadAddress = '';
    let fullJibunAddress = '';

    // API 응답 구조:
    // - 지번 검색: address.parcel에 전체 지번주소, address.road에 축약 도로명
    // - 도로명 검색: address.parcel에 축약 지번(읍면동+번지만), address.road에 전체 도로명주소
    // - 장소 검색: title에 장소명, address.parcel/road에 주소

    const parcelAddr = item.address?.parcel || '';
    const roadAddr = item.address?.road || '';

    if (vworldResultType === 'parcel') {
      // 지번 검색: parcel에 전체 주소 있음, ID에서 파싱된 bun, ji 사용
      fullJibunAddress = parcelAddr;
      roadAddress = roadAddr;
      jibunAddress = parseVWorldTitle(fullJibunAddress, item.bun, item.ji);
    } else if (vworldResultType === 'road') {
      // 도로명 검색: parcel에는 읍면동+번지만(축약형), road에서 시/도,시/군/구 추출
      roadAddress = roadAddr;
      // parcel에서 읍/면/동, 리, 본번, 부번 파싱 (축약형 전용 함수 사용)
      const { eupMyeonDong, li, bonbun, bubun } = parseAbbreviatedParcel(parcelAddr);
      // road에서 시/도, 시/군/구 파싱
      const { sido, sigungu } = parseSidoSigunguFromRoad(roadAddr);
      // 합치기
      jibunAddress = {
        sido,
        sigungu,
        eupMyeonDong,
        li,
        bonbun,
        bubun
      };
      // fullJibunAddress는 시/도 + 시/군/구 + parcel 조합
      fullJibunAddress = `${sido} ${sigungu} ${parcelAddr}`.trim();
    } else {
      // 장소 검색: parcel 형식에 따라 처리 (전체 주소일 수도, 축약일 수도 있음)
      fullJibunAddress = parcelAddr;
      roadAddress = roadAddr;
      // parcel이 축약형인지 확인 (시/도로 시작하는지)
      const firstPart = parcelAddr.split(' ')[0] || '';
      const isFull = firstPart.endsWith('시') || firstPart.endsWith('도');
      if (isFull) {
        jibunAddress = parseVWorldTitle(parcelAddr);
      } else {
        // 축약형이면 road에서 시/도, 시/군/구 추출, parcel에서 읍면동+번지
        const { eupMyeonDong, li, bonbun, bubun } = parseAbbreviatedParcel(parcelAddr);
        const { sido, sigungu } = parseSidoSigunguFromRoad(roadAddr);
        jibunAddress = {
          sido,
          sigungu,
          eupMyeonDong,
          li,
          bonbun,
          bubun
        };
        fullJibunAddress = `${sido} ${sigungu} ${parcelAddr}`.trim();
      }
    }

    onAddressSelect({
      jibunAddress,
      roadAddress,
      fullJibunAddress,
      pnu: item.id || undefined  // VWorld PNU 코드 전달
    });

    setIsVWorldModalOpen(false);
    setVworldQuery('');
    setVworldResults([]);
    setVworldResultType('');
  };

  // 검색 버튼 클릭
  const handleSearchClick = () => {
    if (appSettings.addressApi === 'DAUM') {
      openDaumPostcode();
    } else {
      setIsVWorldModalOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleSearchClick}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-3 text-white rounded-lg transition-colors font-bold text-sm disabled:opacity-50 ${
          appSettings.addressApi === 'DAUM' ? 'bg-[#1a73e8] hover:bg-[#1557b0]' : 'bg-[#34a853] hover:bg-[#2d9249]'
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          appSettings.addressApi === 'DAUM' ? <Search size={16} /> : <MapPin size={16} />
        )}
        {placeholder}
        <span className="text-[10px] opacity-75">({appSettings.addressApi === 'DAUM' ? '다음' : 'VWorld'})</span>
      </button>

      {/* VWorld 검색 모달 */}
      {isVWorldModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsVWorldModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-4 border-b border-[#dadce0] flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MapPin size={20} className="text-[#34a853]" />
                VWorld 주소 검색
              </h3>
              <button onClick={() => setIsVWorldModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vworldQuery}
                  onChange={(e) => setVworldQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchVWorld()}
                  placeholder="지번 검색 (예: 명지동 3317-3)"
                  className="flex-1 border border-[#dadce0] rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#34a853] focus:border-[#34a853]"
                />
                <button
                  onClick={searchVWorld}
                  disabled={isLoading || !vworldQuery.trim()}
                  className="px-5 py-2.5 bg-[#34a853] text-white rounded-lg font-bold hover:bg-[#2d9249] disabled:opacity-50 transition-colors"
                >
                  {isLoading ? '...' : '검색'}
                </button>
              </div>

              {vworldError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{vworldError}</p>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-2">
                {vworldResults.map((item, index) => {
                  // 지번주소와 도로명주소는 모든 타입에서 address 객체에 있음
                  const parcelAddr = item.address?.parcel || '';
                  const roadAddr = item.address?.road || '';
                  // 장소명 (place 검색일 때만 존재)
                  const placeName = vworldResultType === 'place' ? item.title : '';

                  // 파싱 미리보기 (검색 타입에 따라 다르게 처리)
                  let parsed: JibunAddress;
                  let displayJibun = parcelAddr;

                  if (vworldResultType === 'parcel') {
                    parsed = parseVWorldTitle(parcelAddr, item.bun, item.ji);
                  } else if (vworldResultType === 'road') {
                    // 도로명 검색: parcel에서 읍면동+번지(축약형), road에서 시/도,시/군/구
                    const { eupMyeonDong, li, bonbun, bubun } = parseAbbreviatedParcel(parcelAddr);
                    const { sido, sigungu } = parseSidoSigunguFromRoad(roadAddr);
                    parsed = { sido, sigungu, eupMyeonDong, li, bonbun, bubun };
                    displayJibun = `${sido} ${sigungu} ${parcelAddr}`.trim();
                  } else {
                    // 장소 검색
                    const firstPart = parcelAddr.split(' ')[0] || '';
                    const isFull = firstPart.endsWith('시') || firstPart.endsWith('도');
                    if (isFull) {
                      parsed = parseVWorldTitle(parcelAddr);
                    } else {
                      const { eupMyeonDong, li, bonbun, bubun } = parseAbbreviatedParcel(parcelAddr);
                      const { sido, sigungu } = parseSidoSigunguFromRoad(roadAddr);
                      parsed = { sido, sigungu, eupMyeonDong, li, bonbun, bubun };
                      displayJibun = `${sido} ${sigungu} ${parcelAddr}`.trim();
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleVWorldSelect(item)}
                      className="w-full text-left p-3 hover:bg-[#f8f9fa] rounded-lg border border-[#dadce0] transition-colors"
                    >
                      {/* 장소명 (place 검색일 때만) */}
                      {placeName && (
                        <p className="font-bold text-sm text-[#1a73e8] mb-1">{placeName}</p>
                      )}
                      {/* 지번주소 */}
                      <p className="font-medium text-sm text-[#202124]">
                        {displayJibun || '(지번 없음)'}
                      </p>
                      {/* 도로명주소 (있으면) */}
                      {roadAddr && (
                        <p className="text-xs text-[#5f6368] mt-1">도로명: {roadAddr}</p>
                      )}
                      {/* 파싱된 결과 미리보기 */}
                      <p className="text-xs text-[#9aa0a6] mt-1">
                        {parsed.sido} | {parsed.sigungu} | {parsed.eupMyeonDong}{parsed.li ? ` | ${parsed.li}` : ''} | {parsed.bonbun}{parsed.bubun ? `-${parsed.bubun}` : ''}
                      </p>
                    </button>
                  );
                })}
                {vworldResults.length === 0 && !isLoading && !vworldError && (
                  <p className="text-center text-[#5f6368] py-8">검색어를 입력하고 검색 버튼을 클릭하세요</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
