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
}

interface AddressSearchProps {
  onAddressSelect: (address: AddressSearchResult) => void;
  placeholder?: string;
  appSettings: AppSettings;
}

// 지번 주소를 파싱하여 JibunAddress 객체로 변환
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

  // VWorld API 검색
  const searchVWorld = async () => {
    if (!vworldQuery.trim()) return;
    if (!appSettings.vworldApiKey) {
      setVworldError('VWorld API 키가 설정되지 않았습니다. 환경설정에서 API 키를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setVworldError('');
    setVworldResults([]);

    try {
      // VWorld 검색 API 호출
      const response = await fetch(
        `https://api.vworld.kr/req/search?service=search&request=search&version=2.0&crs=EPSG:4326&size=10&page=1&query=${encodeURIComponent(vworldQuery)}&type=address&category=road&format=json&errorformat=json&key=${appSettings.vworldApiKey}`
      );
      const data = await response.json();

      if (data.response?.status === 'OK' && data.response?.result?.items) {
        setVworldResults(data.response.result.items);
      } else if (data.response?.status === 'NOT_FOUND') {
        setVworldError('검색 결과가 없습니다.');
      } else {
        setVworldError(data.response?.error?.text || '검색 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('VWorld 검색 오류:', error);
      setVworldError('API 호출 중 오류가 발생했습니다. API 키와 네트워크를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // VWorld 결과 선택
  const handleVWorldSelect = (item: any) => {
    // VWorld 결과를 파싱
    // item.title: 도로명주소
    // item.address.parcel: 지번주소
    const parcel = item.address?.parcel || item.parcel || '';
    const road = item.title || '';

    // 지번주소 파싱 시도
    const parts = parcel.split(' ');
    let sido = '', sigungu = '', eupMyeonDong = '', bonbun = '', bubun = '';

    if (parts.length >= 3) {
      sido = parts[0] || '';
      sigungu = parts[1] || '';
      eupMyeonDong = parts[2] || '';

      // 마지막 부분에서 번지 추출
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('-')) {
        const [bon, bu] = lastPart.split('-');
        bonbun = bon;
        bubun = bu;
      } else if (/^\d+$/.test(lastPart)) {
        bonbun = lastPart;
      }
    }

    onAddressSelect({
      jibunAddress: {
        sido,
        sigungu,
        eupMyeonDong,
        li: '',
        bonbun,
        bubun
      },
      roadAddress: road,
      fullJibunAddress: parcel
    });

    setIsVWorldModalOpen(false);
    setVworldQuery('');
    setVworldResults([]);
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
                  placeholder="주소를 입력하세요 (예: 서울 강남구 역삼동)"
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
                {vworldResults.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleVWorldSelect(item)}
                    className="w-full text-left p-3 hover:bg-[#f8f9fa] rounded-lg border border-[#dadce0] transition-colors"
                  >
                    <p className="font-medium text-sm text-[#202124]">{item.title}</p>
                    {item.address?.parcel && (
                      <p className="text-xs text-[#5f6368] mt-1">지번: {item.address.parcel}</p>
                    )}
                  </button>
                ))}
                {vworldResults.length === 0 && vworldQuery && !isLoading && !vworldError && (
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
